/**
 * 官網行程 PDF 跟業務系統 Google Drive 上的行程檔連動。
 *
 * 業務系統把每個動態檔的行程 PDF 放在一個 Drive 資料夾（出發地／地區／天數…）。
 * 官網每個方案的 PDF 先用檔名對到 Drive 上的同一個檔，之後用 Drive 的檔案編號追蹤；
 * Drive 上的檔比官網顯示的新，就下載下來換上去。
 *
 * 換上去的 PDF 和對應紀錄另外存（drive-pdf/），只在前台讀取時套用，不改業務存的行程內容。
 * 業務自己換了某個方案的 PDF，舊的套用就失效，下次同步再用新檔重新比對。
 *
 * 這個檔只有純邏輯（沒有網路與 Bucket），方便測試。
 */
import type { SiteContent, Trip, TripPlan } from "./site-content";
import { feedAirlineAliases } from "./tour-feed-match";

export type DriveFile = {
  /** Drive 檔案編號。 */
  id: string;
  name: string;
  /** 業務系統給的資料夾路徑，例如「11.韓國 > 2.釜山 > 早去晚回五天」。 */
  path: string;
  /** Drive 上最後修改的時間（ISO）。 */
  modified: string;
};

/** 業務手動指定：方案（drivePlanKey）→ Drive 檔案編號；"none" 代表這個方案的 PDF 不要跟 Drive 連動。 */
export type DrivePdfLinks = Record<string, string>;

/** 方案 ID 只在同一個行程裡不重複，所以紀錄用「行程 ID:方案 ID」。兩種 ID 都不會有冒號。 */
export function drivePlanKey(tripId: string, planId: string) {
  return `${tripId}:${planId}`;
}

export type DrivePlanProblem =
  /** 檔名在 Drive 上找不到 */
  | "unmatched"
  /** Drive 上有不只一個同名檔，分不出是哪一個 */
  | "ambiguous"
  /** 原本對到的檔在 Drive 上不見了（刪除或換了新檔） */
  | "missing"
  /** 檔案放在「待修」之類的資料夾，先不換 */
  | "draft"
  /** 官網的 PDF 比 Drive 上的新、內容也不一樣（多半是業務自己上傳的），沒有自動換 */
  | "site-newer"
  /** 下載或存檔失敗，下次同步再試 */
  | "failed";

export type DrivePlanState = {
  /** 比對當時官網內容裡這個方案的 PDF 網址；業務換了 PDF 之後就不再套用 pdfKey。 */
  baseUrl: string;
  /** 官網這份 PDF 上傳時的原始檔名（自動對檔用）。 */
  sourceName?: string;
  /** 對到的 Drive 檔；"" 代表沒有對到。 */
  driveId: string;
  driveName: string;
  drivePath: string;
  linkedBy: "auto" | "manual" | "";
  /** 官網目前顯示的版本對應到 Drive 的哪一次修改（ISO）；"" 代表還沒對上版本。 */
  driveVersion: string;
  /** 從 Drive 下載換上去的 PDF；"" 代表官網內容裡原本的 PDF 就是最新的。 */
  pdfKey: string;
  /** 上次換成 Drive 版本的時間（ISO）。 */
  replacedAt?: string;
  problem?: DrivePlanProblem;
  /** ambiguous 時可能的 Drive 檔。 */
  candidates?: string[];
};

export type DrivePdfState = {
  syncedAt: string;
  /** 最近一次同步失敗的原因與時間；成功時沒有這兩個欄位。 */
  error?: string;
  errorAt?: string;
  plans: Record<string, DrivePlanState>;
};

const driveIdPattern = /^[A-Za-z0-9_-]{10,128}$/;

export function isDriveFileId(value: unknown): value is string {
  return typeof value === "string" && driveIdPattern.test(value);
}

/** 業務系統的時間是台北時間「2026/11/27 17:01:53」。轉成 ISO；看不懂就回傳 ""。 */
export function driveTime(value: unknown): string {
  if (typeof value !== "string") return "";
  const match = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) return "";
  const [, year, month, day, hour, minute, second] = match.map(Number);
  const time = Date.UTC(year, month - 1, day, hour - 8, minute, second || 0);
  return Number.isFinite(time) ? new Date(time).toISOString() : "";
}

type TreeNode = { path?: unknown; name?: unknown; files?: unknown; subfolders?: unknown };

/** 業務系統的資料夾樹 → 檔案清單（只留 PDF）。 */
export function flattenDriveTree(root: unknown): DriveFile[] {
  const files: DriveFile[] = [];
  const walk = (node: TreeNode, depth: number) => {
    if (!node || typeof node !== "object" || depth > 12) return;
    const path = typeof node.path === "string" ? node.path : typeof node.name === "string" ? node.name : "";
    for (const file of Array.isArray(node.files) ? node.files : []) {
      const { id, name, modifiedTime } = (file ?? {}) as { id?: unknown; name?: unknown; modifiedTime?: unknown };
      if (!isDriveFileId(id) || typeof name !== "string" || !/\.pdf$/i.test(name.trim())) continue;
      files.push({ id, name: name.trim(), path, modified: driveTime(modifiedTime) });
    }
    for (const child of Array.isArray(node.subfolders) ? node.subfolders : []) walk(child as TreeNode, depth + 1);
  };
  walk(root as TreeNode, 0);
  return files;
}

/** 比對檔名用：全形半形、空白、副檔名、大小寫都不計。 */
export function driveNameKey(name: string) {
  return name
    .normalize("NFKC")
    .replace(/\.pdf$/i, "")
    .replace(/[\s_]+/g, "")
    .replace(/[~〜]/g, "～")
    .toLowerCase();
}

/** 旅展資料夾的檔名前面常多了排序用的「1.」「更1.」，Drive 上不一定有。 */
function looseNameKey(key: string) {
  return key.replace(/^(?:更新?|new|新)?[-.]?\d{0,2}[-.、]?/, "");
}

export function isDraftPath(path: string) {
  return /待修|待改|草稿|修改中/.test(path);
}

/** 方案的出發地：高雄、台中、台南；其他當作台北。 */
function planCity(plan: Pick<TripPlan, "airline" | "title" | "departureAirport">) {
  const text = `${plan.departureAirport ?? ""}${plan.title}${plan.airline}`;
  return /高雄|小港/.test(text) ? "高" : /台中|臺中/.test(text) ? "中" : /台南|臺南/.test(text) ? "南" : "";
}

function pathCity(path: string) {
  const text = path.normalize("NFKC");
  return /高雄|高[=／/]|高出/.test(text) ? "高" : /台中|臺中|中[=／/]/.test(text) ? "中" : /台南|臺南|南[=／/]/.test(text) ? "南" : "";
}

const airlineWords = ["亞航", "酷航", "星宇", "華航", "長榮", "虎航", "國泰", "樂桃", "易斯達", "濟州", "德威", "真航空", "釜山航空", "大韓", "韓亞", "越捷", "吉祥", "國航", "東航", "南航", "土航", "華信", "立榮"];

function airlineMatches(plan: Pick<TripPlan, "airline">, path: string) {
  const text = path.normalize("NFKC");
  const codes = text.match(/\b[A-Z0-9]{2}\b/g) ?? [];
  if (codes.some((code) => feedAirlineAliases(code).some((alias) => plan.airline.includes(alias)))) return true;
  return airlineWords.some((word) => text.includes(word) && plan.airline.includes(word));
}

/** 方案名稱裡可以拿來認資料夾的字，例如「台北出發・早去晚回」的「早去晚回」。出發地與日期不算。 */
function planWords(plan: Pick<TripPlan, "title">) {
  return plan.title
    .normalize("NFKC")
    .split(/[・\s、,，/／()（）+＋]+/)
    .filter((word) => word.length >= 2 && !/出發|限|\d/.test(word));
}

export type AutoLink =
  | { file: DriveFile }
  | { problem: "unmatched" }
  | { problem: "ambiguous"; candidates: DriveFile[] };

/** 官網 PDF 的原始檔名。批次匯入存的是資料夾裡的相對路徑（「旅展行程/3.新馬.泰國/…/檔名.pdf」），只取最後的檔名。 */
export function sourceBaseName(filename: string) {
  return filename.split(/[\\/]/).pop() ?? "";
}

/**
 * 用官網 PDF 的原始檔名找 Drive 上的同一個檔。
 * 同名檔不只一個時（例如台北、高雄出發各放一份），看資料夾的出發地、航空，
 * 以及方案名稱裡的字（「早去晚回」）跟資料夾名稱相不相符。
 */
export function autoLinkPlan(
  plan: Pick<TripPlan, "airline" | "title" | "departureAirport">,
  filename: string,
  files: DriveFile[],
): AutoLink {
  const key = driveNameKey(sourceBaseName(filename));
  if (!key) return { problem: "unmatched" };
  let found = files.filter((file) => driveNameKey(file.name) === key);
  if (found.length === 0) found = files.filter((file) => looseNameKey(driveNameKey(file.name)) === looseNameKey(key));
  if (found.length === 0) return { problem: "unmatched" };
  // 同一個檔可能出現在兩個動態檔的資料夾（MSC 和麗星輪共用一個），用編號去重。
  const unique = [...new Map(found.map((file) => [file.id, file])).values()];
  if (unique.length === 1) return { file: unique[0] };

  const city = planCity(plan);
  const words = planWords(plan);
  const scored = unique
    .map((file) => {
      const path = file.path.normalize("NFKC");
      const score =
        (pathCity(path) === city ? 2 : 0) + (airlineMatches(plan, path) ? 1 : 0) + (words.some((word) => path.includes(word)) ? 1.5 : 0);
      return { file, score };
    })
    .sort((a, b) => b.score - a.score);
  if (scored[0].score > scored[1].score) return { file: scored[0].file };
  return { problem: "ambiguous", candidates: unique };
}

/**
 * 同一個行程裡兩個方案用同名的 PDF（例如台北出發、早去晚回各一份）：
 * 其中一個已經認出是哪個檔，剩下那個就是另一個檔。
 */
export function resolveBySiblings(candidates: string[], takenBySiblings: Iterable<string>) {
  const taken = new Set(takenBySiblings);
  const left = candidates.filter((id) => !taken.has(id));
  return left.length === 1 && left.length < candidates.length ? left[0] : null;
}

/**
 * 官網這份 PDF 是什麼時候的版本：後台有「行程更新日」（批次匯入時填的是原始檔的修改日）就用它，
 * 只有日期就算到當天結束（台北時間），寧可不換也不要換錯；沒有填才用上傳時間。
 */
export function siteDocumentTime(plan: Pick<TripPlan, "documentUpdatedAt">, pdfKey: string) {
  const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(plan.documentUpdatedAt ?? "");
  if (date) return Date.UTC(Number(date[1]), Number(date[2]) - 1, Number(date[3]), 23 - 8, 59, 59);
  return uploadedAtFromKey(pdfKey);
}

const gradeWords = ["超值", "精彩", "豪華", "特惠", "尊爵", "樂活", "歡樂", "親子", "快閃", "全覽", "經典"];

/** 建議用：去掉編號、括號註記、限定日期等裝飾，只留行程本身的名字。 */
function coreName(name: string) {
  return driveNameKey(sourceBaseName(name))
    .replace(/^(?:new|更新?|新)/, "")
    .replace(/^[\d.、-]+/, "")
    .replace(/\([^)]*\)|[【】「」◆@=]/g, "")
    .replace(/^限[\d.、~～-]+/, "")
    .replace(/[-~～_]/g, "");
}

function bigrams(text: string) {
  const set = new Set<string>();
  for (let index = 0; index < text.length - 1; index++) set.add(text.slice(index, index + 2));
  return set;
}

function similarity(a: Set<string>, b: Set<string>) {
  let shared = 0;
  for (const pair of a) if (b.has(pair)) shared++;
  return a.size + b.size === 0 ? 0 : (2 * shared) / (a.size + b.size);
}

const dayCount = (name: string) => /(\d{1,2}|[一二三四五六七八九十]{1,3})\s*[日天]/.exec(name.normalize("NFKC"))?.[1] ?? "";
const bracketName = (name: string) => /「([^」]+)」|【([^】]+)】/.exec(name)?.slice(1).find(Boolean) ?? "";
const gradeOf = (name: string) => gradeWords.find((word) => name.includes(word)) ?? "";

/**
 * 檔名對不到時，給業務一個「名稱最接近」的檔參考（不會自動套用）。
 * 天數、「」裡的行程名稱或等級（快閃／精彩）不一樣的，就算名稱很像也不建議。
 */
export function suggestDriveFile(filename: string, files: DriveFile[]): DriveFile | null {
  const base = sourceBaseName(filename);
  const target = bigrams(coreName(base));
  const days = dayCount(base);
  const bracket = bracketName(base);
  const grade = gradeOf(base);
  let best: { file: DriveFile; score: number } | null = null;
  for (const file of files) {
    if ((days && dayCount(file.name) && dayCount(file.name) !== days) || (bracket && bracketName(file.name) && bracketName(file.name) !== bracket)) continue;
    if (grade && gradeOf(file.name) && gradeOf(file.name) !== grade) continue;
    const score = similarity(target, bigrams(coreName(file.name)));
    if (!best || score > best.score) best = { file, score };
  }
  return best && best.score >= 0.6 ? best.file : null;
}

/**
 * 原本對到的檔不見了：業務常是刪掉舊檔、在同一個資料夾放同名的新檔。
 * 同資料夾裡剛好一個同名檔，就當成是同一份。
 */
export function findReplacement(previous: Pick<DrivePlanState, "driveName" | "drivePath">, files: DriveFile[]) {
  const key = driveNameKey(previous.driveName);
  const found = files.filter((file) => file.path === previous.drivePath && driveNameKey(file.name) === key);
  return found.length === 1 ? found[0] : null;
}

/** 官網 PDF 上傳的時間：檔名開頭就是上傳當下的毫秒數。 */
export function uploadedAtFromKey(pdfKey: string) {
  const match = /^trip-pdfs\/(\d{13})-/.exec(pdfKey);
  return match ? Number(match[1]) : 0;
}

export function tripPdfUrl(pdfKey: string) {
  return `/api/trip-pdf?key=${encodeURIComponent(pdfKey)}`;
}

/** 這個方案目前要不要換成 Drive 下載的 PDF。 */
function overlayKey(trip: Trip, plan: TripPlan, state: DrivePdfState, links: DrivePdfLinks) {
  const key = drivePlanKey(trip.id, plan.id);
  const entry = state.plans[key];
  if (!entry?.pdfKey || entry.baseUrl !== plan.documentUrl) return "";
  if (links[key] === "none") return "";
  return entry.pdfKey;
}

/** 前台讀取時套用：把有新版的方案換成 Drive 下載的 PDF。沒有要換的就回傳原物件。 */
export function applyDrivePdfs(content: SiteContent, state: DrivePdfState | null, links: DrivePdfLinks): SiteContent {
  if (!state) return content;
  let changed = false;
  const trips = content.trips.map((trip) => {
    let tripChanged = false;
    const plans = trip.plans.map((plan) => {
      const key = overlayKey(trip, plan, state, links);
      if (!key) return plan;
      tripChanged = true;
      return { ...plan, documentUrl: tripPdfUrl(key) };
    });
    if (!tripChanged) return trip;
    changed = true;
    return { ...trip, plans };
  });
  return changed ? { ...content, trips } : content;
}

/** 後台用：這個方案現在的狀況，給業務看的一句話分類。 */
export type DrivePlanStatus = "off" | "unchecked" | "replaced" | "current" | "changed-on-site" | DrivePlanProblem;

export function drivePlanStatus(
  tripId: string,
  plan: Pick<TripPlan, "id" | "documentUrl">,
  state: DrivePdfState | null,
  links: DrivePdfLinks,
): DrivePlanStatus {
  const key = drivePlanKey(tripId, plan.id);
  if (links[key] === "none") return "off";
  const entry = state?.plans[key];
  if (!entry) return "unchecked";
  if (entry.baseUrl !== plan.documentUrl) return "changed-on-site";
  if (entry.problem) return entry.problem;
  return entry.pdfKey ? "replaced" : "current";
}
