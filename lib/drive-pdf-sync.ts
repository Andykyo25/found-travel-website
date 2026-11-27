import "server-only";
import { getSiteContentWithMeta, type Trip, type TripPlan } from "./site-content";
import { isRailwayStorageConfigured, readTripPdfInfo, uploadTripPdf } from "./railway-storage";
import { tripPdfKeyFromDocumentUrl } from "./storage-keys";
import { storeTripPdfText } from "./trip-pdf-content";
import { listFeedFiles, openFeedSession, TourFeedError } from "./tour-feed-sync";
import {
  autoLinkPlan,
  drivePlanKey,
  findReplacement,
  flattenDriveTree,
  isDraftPath,
  isDriveFileId,
  uploadedAtFromKey,
  type DriveFile,
  type DrivePdfLinks,
  type DrivePdfState,
  type DrivePlanState,
} from "./drive-pdf";
import { readDriveFiles, readDrivePdfStateFresh, saveDriveFiles, saveDrivePdfState } from "./drive-pdf-store";

/**
 * 行程 PDF 跟業務系統 Drive 連動（規則見 lib/drive-pdf.ts）。
 *
 * 對業務系統只讀：登入後讀動態檔清單與每個檔的行程資料夾樹。
 * PDF 本身從 Drive 的公開連結下載（業務系統給客人的行程連結也是這種），不需要 Drive 帳號。
 */

const maxPdfBytes = 25 * 1024 * 1024;
const downloadTimeoutMs = 60_000;
const concurrency = 4;

function driveDownloadUrl(id: string) {
  return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`;
}

function looksLikePdf(bytes: Uint8Array) {
  const signature = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
  const limit = Math.min(bytes.length - signature.length, 1024);
  for (let start = 0; start <= limit; start++) {
    if (signature.every((value, offset) => bytes[start + offset] === value)) return true;
  }
  return false;
}

async function downloadDrivePdf(id: string): Promise<Uint8Array> {
  if (!isDriveFileId(id)) throw new Error("Invalid Drive file id");
  const response = await fetch(driveDownloadUrl(id), { signal: AbortSignal.timeout(downloadTimeoutMs), cache: "no-store" });
  if (!response.ok || !response.body) throw new Error(`Drive responded ${response.status}`);
  if (Number(response.headers.get("content-length") ?? 0) > maxPdfBytes) {
    await response.body.cancel();
    throw new Error("PDF is larger than 25 MB");
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxPdfBytes) {
      await reader.cancel();
      throw new Error("PDF is larger than 25 MB");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  // 沒有開放連結的檔，Drive 會回一頁登入畫面（HTML），不是 PDF。
  if (!looksLikePdf(bytes)) throw new Error("Drive did not return a PDF");
  return bytes;
}

/** Drive 上檔案的大小：只要第一個位元組，從 Content-Range 讀總長度。讀不到回傳 0。 */
async function driveFileSize(id: string) {
  try {
    const response = await fetch(driveDownloadUrl(id), {
      headers: { Range: "bytes=0-0" },
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
    });
    await response.body?.cancel();
    const total = /\/(\d+)$/.exec(response.headers.get("content-range") ?? "");
    return total ? Number(total[1]) : 0;
  } catch {
    return 0;
  }
}

async function eachLimit<T>(items: T[], limit: number, run: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) await run(items[next++]);
    }),
  );
}

const rootOf = (file: DriveFile) => file.path.split(" > ")[0] ?? "";

/** 讀全部動態檔的行程資料夾。MSC 與麗星輪共用一個資料夾，同一個檔只留一份。 */
async function fetchDriveFiles(): Promise<DriveFile[]> {
  const session = await openFeedSession();
  const byId = new Map<string, DriveFile>();
  for (const entry of await listFeedFiles(session)) {
    const tree = await session.getJson("讀取行程資料夾", `/api/itineraries-tree?${new URLSearchParams({ fileName: entry.name })}`);
    for (const file of flattenDriveTree(tree)) if (!byId.has(file.id)) byId.set(file.id, file);
  }
  return [...byId.values()];
}

/**
 * 一整個資料夾突然讀不到檔案，多半是業務系統那邊出狀況，不是真的全刪了。
 * 這時候停下來，不要把那些方案都標成「Drive 上找不到」。
 */
function checkNothingVanished(files: DriveFile[], previous: DriveFile[] | undefined) {
  if (files.length === 0) throw new TourFeedError("讀取行程資料夾：一個 PDF 都沒有讀到");
  if (!previous) return;
  const now = new Set(files.map(rootOf));
  const before = new Map<string, number>();
  for (const file of previous) before.set(rootOf(file), (before.get(rootOf(file)) ?? 0) + 1);
  for (const [root, count] of before) {
    if (count >= 5 && !now.has(root)) throw new TourFeedError(`讀取行程資料夾：「${root}」整個讀不到檔案`);
  }
}

type PlanJob = { trip: Trip; plan: TripPlan; key: string; contentKey: string };

/** 一次同步裡，同一份官網 PDF 只向 Bucket 問一次檔名與大小。 */
function infoReader() {
  const cache = new Map<string, Promise<{ filename: string; size: number } | null>>();
  return (pdfKey: string) => {
    if (!cache.has(pdfKey)) cache.set(pdfKey, readTripPdfInfo(pdfKey).catch(() => null));
    return cache.get(pdfKey)!;
  };
}

async function replaceWithDrive(file: DriveFile, now: string) {
  const bytes = await downloadDrivePdf(file.id);
  const pdfKey = await uploadTripPdf(bytes, file.name, "drive-sync");
  // 每日行程跟著新 PDF 重新整理；失敗只記錄，不影響換檔。
  await storeTripPdfText(pdfKey, bytes);
  return { pdfKey, driveVersion: file.modified || now, replacedAt: now };
}

async function reconcilePlan(
  job: PlanJob,
  previous: DrivePlanState | undefined,
  link: string | undefined,
  files: DriveFile[],
  byId: Map<string, DriveFile>,
  info: ReturnType<typeof infoReader>,
  now: string,
): Promise<DrivePlanState> {
  const { plan, contentKey } = job;
  const sameBase = previous?.baseUrl === plan.documentUrl;
  const kept = sameBase
    ? { pdfKey: previous.pdfKey, driveVersion: previous.driveVersion, ...(previous.replacedAt ? { replacedAt: previous.replacedAt } : {}) }
    : { pdfKey: "", driveVersion: "" };
  const base = { baseUrl: plan.documentUrl, ...(sameBase && previous.sourceName !== undefined ? { sourceName: previous.sourceName } : {}) };

  // 1. 這個方案對到 Drive 上哪個檔：業務指定的 → 之前自動對到的 → 用檔名找。
  let file: DriveFile | undefined;
  let linkedBy: "auto" | "manual" = "auto";
  if (link) {
    linkedBy = "manual";
    file = byId.get(link);
    if (!file) {
      const known = previous?.driveId === link;
      return { ...base, ...kept, driveId: link, driveName: known ? previous.driveName : "", drivePath: known ? previous.drivePath : "", linkedBy, problem: "missing" };
    }
  } else if (sameBase && previous.linkedBy === "auto" && previous.driveId) {
    file = byId.get(previous.driveId) ?? findReplacement(previous, files) ?? undefined;
    if (!file) {
      return { ...base, ...kept, driveId: previous.driveId, driveName: previous.driveName, drivePath: previous.drivePath, linkedBy, problem: "missing" };
    }
  } else {
    const sourceName = base.sourceName ?? ((await info(contentKey))?.filename || (/\.pdf$/i.test(plan.documentName) ? plan.documentName : ""));
    const found = autoLinkPlan(plan, sourceName, files);
    if ("problem" in found) {
      return {
        baseUrl: plan.documentUrl,
        sourceName,
        driveId: "",
        driveName: "",
        drivePath: "",
        linkedBy: "",
        pdfKey: "",
        driveVersion: "",
        problem: found.problem,
        ...(found.problem === "ambiguous" ? { candidates: found.candidates.map((candidate) => candidate.id) } : {}),
      };
    }
    file = found.file;
    base.sourceName = sourceName;
  }

  const entry = { ...base, driveId: file.id, driveName: file.name, drivePath: file.path, linkedBy };
  const sameFile = sameBase && previous.driveId === file.id;
  const keptForFile = sameFile ? kept : { pdfKey: sameBase ? previous.pdfKey : "", driveVersion: "" };
  if (isDraftPath(file.path)) return { ...entry, ...keptForFile, problem: "draft" };

  // 2. 要不要換：已經比過這個檔，就看 Drive 有沒有再改過。
  if (sameFile && previous.driveVersion) {
    if (file.modified && file.modified > previous.driveVersion) {
      try {
        return { ...entry, ...(await replaceWithDrive(file, now)) };
      } catch (error) {
        console.error("Drive PDF replacement failed", file.id, error);
        return { ...entry, ...kept, problem: "failed" };
      }
    }
    return { ...entry, ...kept, ...(previous.problem === "site-newer" ? { problem: "site-newer" as const } : {}) };
  }

  // 第一次跟這個檔比：Drive 改得比官網這份上傳得晚，就換成 Drive 的。
  // 官網這份比較新的話先比大小：一樣就是同一份；不一樣多半是業務自己上傳的版本，不自動蓋掉，交給業務決定。
  const shownKey = keptForFile.pdfKey || contentKey;
  const driveIsNewer = Boolean(file.modified) && Date.parse(file.modified) > uploadedAtFromKey(shownKey);
  let differs = false;
  if (!driveIsNewer || linkedBy === "manual") {
    const [siteSize, driveSize] = await Promise.all([info(shownKey).then((value) => value?.size ?? 0), driveFileSize(file.id)]);
    differs = siteSize > 0 && driveSize > 0 && siteSize !== driveSize;
  }
  if (driveIsNewer || (linkedBy === "manual" && differs)) {
    try {
      return { ...entry, ...(await replaceWithDrive(file, now)) };
    } catch (error) {
      console.error("Drive PDF replacement failed", file.id, error);
      return { ...entry, ...keptForFile, problem: "failed" };
    }
  }
  return {
    ...entry,
    pdfKey: keptForFile.pdfKey,
    driveVersion: file.modified || now,
    ...(sameBase && keptForFile.pdfKey && previous.replacedAt ? { replacedAt: previous.replacedAt } : {}),
    ...(differs ? { problem: "site-newer" as const } : {}),
  };
}

function planJobs(trips: Trip[], links: DrivePdfLinks): PlanJob[] {
  return trips.flatMap((trip) =>
    trip.plans.flatMap((plan) => {
      if (plan.documentType !== "pdf") return [];
      const contentKey = tripPdfKeyFromDocumentUrl(plan.documentUrl);
      const key = drivePlanKey(trip.id, plan.id);
      // 業務設定「不要連動」的方案不留紀錄。
      return contentKey && links[key] !== "none" ? [{ trip, plan, key, contentKey }] : [];
    }),
  );
}

export type DrivePdfSyncResult = { syncedAt: string; plans: number; replaced: number; problems: number };

// 同步與後台的「改用 Drive 版本」都會改同一份紀錄，同一時間只做一件事。
let busy: Promise<unknown> | null = null;

export function isDrivePdfSyncRunning() {
  return busy !== null;
}

function exclusive<T>(task: () => Promise<T>): Promise<T> {
  if (busy) return Promise.reject(new TourFeedError("PDF 同步進行中，請一兩分鐘後再試"));
  const run = task().finally(() => {
    busy = null;
  });
  busy = run;
  return run;
}

async function runSync(): Promise<DrivePdfSyncResult> {
  if (!isRailwayStorageConfigured()) throw new TourFeedError("檔案儲存空間尚未啟用");
  const { state: previous, links } = await readDrivePdfStateFresh();
  try {
    const files = await fetchDriveFiles();
    checkNothingVanished(files, (await readDriveFiles())?.files);
    const now = new Date().toISOString();
    await saveDriveFiles({ fetchedAt: now, files });

    const { content } = await getSiteContentWithMeta();
    const byId = new Map(files.map((file) => [file.id, file]));
    const info = infoReader();
    const plans: Record<string, DrivePlanState> = {};
    const linkFor = (key: string) => (links[key] && links[key] !== "none" ? links[key] : undefined);
    await eachLimit(planJobs(content.trips, links), concurrency, async (job) => {
      plans[job.key] = await reconcilePlan(job, previous?.plans[job.key], linkFor(job.key), files, byId, info, now);
    });

    const state: DrivePdfState = { syncedAt: now, plans };
    await saveDrivePdfState(state);
    const entries = Object.values(plans);
    return {
      syncedAt: now,
      plans: entries.length,
      replaced: entries.filter((entry) => entry.replacedAt === now).length,
      problems: entries.filter((entry) => entry.problem).length,
    };
  } catch (error) {
    // 記下失敗原因給後台看；上一次的結果照常套用。
    const reason = error instanceof TourFeedError ? error.message : "原因不明";
    await saveDrivePdfState({ syncedAt: previous?.syncedAt ?? "", plans: previous?.plans ?? {}, error: reason, errorAt: new Date().toISOString() }).catch(
      (saveError) => console.error("Unable to record Drive PDF sync failure", saveError),
    );
    throw error;
  }
}

/** 排程與後台「立即同步」用。 */
export function syncDrivePdfs(): Promise<DrivePdfSyncResult> {
  return exclusive(runSync);
}

/**
 * 後台用：立刻把某個方案換成 Drive 上的版本（業務剛指定檔案，或確認要蓋掉官網自己的版本）。
 * 用上次同步讀到的檔案清單，不用重新登入業務系統。
 */
export function replacePlanWithDrive(tripId: string, planId: string): Promise<DrivePlanState> {
  return exclusive(async () => {
    const key = drivePlanKey(tripId, planId);
    const { content } = await getSiteContentWithMeta();
    const plan = content.trips.find((trip) => trip.id === tripId)?.plans.find((item) => item.id === planId);
    if (!plan || plan.documentType !== "pdf" || !tripPdfKeyFromDocumentUrl(plan.documentUrl)) {
      throw new TourFeedError("找不到這個方案的 PDF，請重新整理後再試");
    }
    const { state, links } = await readDrivePdfStateFresh();
    const previous = state?.plans[key];
    const driveId = links[key] && links[key] !== "none" ? links[key] : previous?.driveId;
    const file = (await readDriveFiles())?.files.find((item) => item.id === driveId);
    if (!file) throw new TourFeedError("Drive 檔案清單裡找不到這個檔，請先按「立即同步」");

    const now = new Date().toISOString();
    let replaced;
    try {
      replaced = await replaceWithDrive(file, now);
    } catch (error) {
      console.error("Drive PDF replacement failed", file.id, error);
      throw new TourFeedError("從 Drive 下載失敗，可能是檔案沒有開放連結，請稍後再試");
    }
    const entry: DrivePlanState = {
      baseUrl: plan.documentUrl,
      ...(previous?.baseUrl === plan.documentUrl && previous.sourceName !== undefined ? { sourceName: previous.sourceName } : {}),
      driveId: file.id,
      driveName: file.name,
      drivePath: file.path,
      linkedBy: links[key] && links[key] !== "none" ? "manual" : "auto",
      ...replaced,
    };
    const latest = (await readDrivePdfStateFresh()).state;
    await saveDrivePdfState({ ...(latest ?? { syncedAt: "" }), plans: { ...(latest?.plans ?? {}), [key]: entry } });
    return entry;
  });
}
