// 批次匯入行程：業務選一個資料夾（裡面放行程 PDF 和「匯入清單.json」），後台一次把 PDF 上傳、行程加到網站。
// 清單由整理程式先產生：每個行程的資料、每個版本對應資料夾裡的哪一份 PDF。
// 這裡只放純函式（讀清單、對檔案、合併到現有行程），後台頁面與 API 共用；只 import type，不帶進伺服器端模組。
import type { Trip, TripPlan } from "./site-content";

export const importListFileName = "匯入清單.json";

/** 一次最多匯入幾個行程（避免誤選到不相干的大清單）。 */
export const maxImportTrips = 600;

export type ImportPlan = Omit<TripPlan, "documentUrl"> & {
  /** PDF 在所選資料夾裡的位置，例如「5.韓國 A/首爾/(ZE)首爾「超值」五日遊.pdf」。 */
  file: string;
};

export type ImportTrip = Omit<Trip, "plans"> & { plans: ImportPlan[] };

export type ImportList = { version: 1; source: string; trips: ImportTrip[] };

const text = (value: unknown) => (typeof value === "string" ? value : "");

/** 統一路徑寫法：Unicode 正規化、斜線、去掉前後空白；不接受跳出資料夾的路徑。 */
export function normalizeImportPath(value: string) {
  const path = value.normalize("NFC").replace(/\\/g, "/").replace(/^\/+/, "").trim();
  if (!path || path.split("/").some((part) => part === ".." || part === ".")) return "";
  return path;
}

/** 瀏覽器回報的路徑是「所選資料夾名稱/子資料夾/檔名」，比對時去掉最前面的資料夾名稱。 */
export function pathInsideSelectedFolder(webkitRelativePath: string) {
  const path = normalizeImportPath(webkitRelativePath);
  const slash = path.indexOf("/");
  return slash === -1 ? path : path.slice(slash + 1);
}

export function parseImportList(value: unknown): { list: ImportList } | { error: string } {
  if (!value || typeof value !== "object") return { error: "匯入清單格式不正確" };
  const input = value as { version?: unknown; source?: unknown; trips?: unknown };
  if (input.version !== 1) return { error: "匯入清單版本不支援，請重新產生清單" };
  if (!Array.isArray(input.trips) || input.trips.length === 0) return { error: "匯入清單裡沒有行程" };
  if (input.trips.length > maxImportTrips) return { error: `一次最多匯入 ${maxImportTrips} 個行程` };

  const trips: ImportTrip[] = [];
  for (const [index, item] of input.trips.entries()) {
    const trip = (item ?? {}) as Partial<ImportTrip>;
    const name = text(trip.title).trim() || `第 ${index + 1} 個行程`;
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(text(trip.id))) return { error: `「${name}」缺少行程編號` };
    if (!Array.isArray(trip.plans) || trip.plans.length === 0) return { error: `「${name}」沒有任何版本` };
    const plans: ImportPlan[] = [];
    for (const plan of trip.plans) {
      const file = normalizeImportPath(text(plan?.file));
      if (!file || !/\.pdf$/i.test(file)) return { error: `「${name}」有版本沒有對應的 PDF` };
      plans.push({ ...(plan as ImportPlan), file });
    }
    trips.push({ ...(trip as ImportTrip), plans });
  }
  return { list: { version: 1, source: text(input.source), trips } };
}

export type ImportMatch<F> = {
  /** 每個版本都找得到 PDF 的行程（找不到的版本已拿掉；一個版本都沒有的行程不在這裡）。 */
  trips: { trip: ImportTrip; files: Map<string, F> }[];
  missingFiles: string[];
  skippedTrips: string[];
};

/** 用清單裡的路徑對應所選資料夾裡的檔案。files 的 key 要先用 pathInsideSelectedFolder 處理過。 */
export function matchImportFiles<F>(list: ImportList, files: Map<string, F>): ImportMatch<F> {
  const result: ImportMatch<F> = { trips: [], missingFiles: [], skippedTrips: [] };
  for (const trip of list.trips) {
    const found = new Map<string, F>();
    const plans = trip.plans.filter((plan) => {
      const file = files.get(plan.file);
      if (!file) {
        result.missingFiles.push(plan.file);
        return false;
      }
      found.set(plan.id, file);
      return true;
    });
    if (plans.length === 0) {
      result.skippedTrips.push(trip.title);
      continue;
    }
    // 拿掉的版本若被團期指定過，團期還在、只是少一個可選的版本，不影響其他資料。
    result.trips.push({ trip: { ...trip, plans }, files: found });
  }
  return result;
}

/** PDF 上傳後換成網站用的版本（填入 PDF 網址、拿掉檔案路徑）。 */
export function tripWithDocuments(trip: ImportTrip, urls: Map<string, string>): Trip {
  return {
    ...trip,
    plans: trip.plans.map((plan) => {
      const stored: Partial<ImportPlan> = { ...plan };
      delete stored.file;
      return { ...(stored as Omit<ImportPlan, "file">), documentType: "pdf" as const, documentUrl: urls.get(plan.id) ?? "" };
    }),
  };
}

/**
 * 把匯入的行程接在現有行程後面。已經在網站上的行程（同一個編號）不重複加入，
 * 所以中斷後重新匯入是安全的；網址代稱撞到現有行程時改由網站自動產生。
 */
export function mergeImportedTrips(existing: Trip[], incoming: Trip[]) {
  const ids = new Set(existing.map((trip) => trip.id));
  const slugs = new Set(existing.flatMap((trip) => [trip.slug ?? "", ...(trip.previousSlugs ?? []), trip.id]).filter(Boolean));
  const added: Trip[] = [];
  const alreadyThere: string[] = [];
  for (const trip of incoming) {
    if (ids.has(trip.id)) {
      alreadyThere.push(trip.title);
      continue;
    }
    ids.add(trip.id);
    const slug = trip.slug && !slugs.has(trip.slug) ? trip.slug : undefined;
    if (slug) slugs.add(slug);
    const copy: Trip = { ...trip };
    delete copy.slug;
    added.push(slug ? { ...copy, slug } : copy);
  }
  return { trips: [...existing, ...added], added, alreadyThere };
}
