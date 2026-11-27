import "server-only";
import { readTourFeedObject, writeTourFeedObject } from "./railway-storage";
import { isDriveFileId, type DriveFile, type DrivePdfLinks, type DrivePdfState } from "./drive-pdf";

// 跟團期同步一樣：同步結果留在記憶體，前台讀取不用每次都去 Bucket；每 5 分鐘在背景重讀一次。
type PdfOverlayState = { state: DrivePdfState | null; links: DrivePdfLinks };
const reloadAfterMs = 5 * 60_000;
let cached: PdfOverlayState | null = null;
let loadedAt = 0;
let loading: Promise<PdfOverlayState> | null = null;

function asState(value: unknown): DrivePdfState | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<DrivePdfState>;
  return typeof candidate.syncedAt === "string" && candidate.plans && typeof candidate.plans === "object" && !Array.isArray(candidate.plans)
    ? (candidate as DrivePdfState)
    : null;
}

function asLinks(value: unknown): DrivePdfLinks {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => entry[1] === "none" || isDriveFileId(entry[1])),
  );
}

function load(): Promise<PdfOverlayState> {
  loading ??= Promise.all([readTourFeedObject("pdfState"), readTourFeedObject("pdfLinks")])
    .then(([state, links]) => {
      cached = { state: asState(state), links: asLinks(links) };
      loadedAt = Date.now();
      return cached;
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}

/** 讀不到就回傳空的：前台照常顯示業務上傳的 PDF。 */
export async function getDrivePdfState(): Promise<PdfOverlayState> {
  if (cached) {
    if (Date.now() - loadedAt > reloadAfterMs) void load().catch((error) => console.error("Unable to reload Drive PDF state", error));
    return cached;
  }
  try {
    return await load();
  } catch (error) {
    console.error("Unable to load Drive PDF state", error);
    loadedAt = Date.now();
    cached = { state: null, links: {} };
    return cached;
  }
}

/** 後台與同步用：一律直接讀 Bucket，不用記憶體裡的舊資料。 */
export async function readDrivePdfStateFresh(): Promise<PdfOverlayState> {
  return load();
}

export async function saveDrivePdfState(state: DrivePdfState) {
  await writeTourFeedObject("pdfState", state);
  cached = { state, links: cached?.links ?? asLinks(await readTourFeedObject("pdfLinks")) };
  loadedAt = Date.now();
}

export async function saveDrivePdfLink(planId: string, value: string | null) {
  const links = { ...asLinks(await readTourFeedObject("pdfLinks")) };
  if (value === null) delete links[planId];
  else links[planId] = value;
  await writeTourFeedObject("pdfLinks", links);
  cached = { state: cached?.state ?? asState(await readTourFeedObject("pdfState")), links };
  loadedAt = Date.now();
  return links;
}

export type DriveFileList = { fetchedAt: string; files: DriveFile[] };

/** 上次同步讀到的 Drive 檔案清單（後台手動指定檔案時用）。 */
export async function readDriveFiles(): Promise<DriveFileList | null> {
  const value = (await readTourFeedObject("pdfFiles")) as Partial<DriveFileList> | null;
  return value && typeof value.fetchedAt === "string" && Array.isArray(value.files) ? (value as DriveFileList) : null;
}

export async function saveDriveFiles(list: DriveFileList) {
  await writeTourFeedObject("pdfFiles", list);
}
