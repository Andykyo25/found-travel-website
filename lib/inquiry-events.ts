// 詢問來源統計：記下客人在哪一頁按了 LINE、從哪一頁送出聯絡表單。
// 只記「哪一種、哪一頁、哪一天」，不記任何個人資料、IP 或網址參數，也不用第三方追蹤。
// 這裡都是純函式（前後台共用、可測試），寫入儲存空間在 app/api/inquiry-events。

export const inquiryKinds = ["line", "form"] as const;
export type InquiryKind = (typeof inquiryKinds)[number];

/** 只收前台的頁面，擋掉亂送的路徑，也避免把後台算進來。 */
const trackedPath = /^\/(?:$|trips\/[^/]+$|news(?:\/[^/]+)?$|dates(?:\/month\/[^/]+)?$|destinations(?:\/[^/]+)?$|find-trip$|about$|vip$|contact$)/;

export function normalizeInquiryPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.length > 160) return null;
  const path = value.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  try {
    const decoded = decodeURIComponent(path);
    return trackedPath.test(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

export function isInquiryKind(value: unknown): value is InquiryKind {
  return typeof value === "string" && (inquiryKinds as readonly string[]).includes(value);
}

// 儲存格式：每次點擊一個空物件，資訊全在檔名裡，統計時只要列檔名、不用逐一讀內容。
// inquiry-events/2026-11-26/line/<頁面路徑 base64url>/<時間戳>-<亂數>
export const inquiryEventPrefix = "inquiry-events/";

function toBase64Url(text: string) {
  return btoa(String.fromCharCode(...new TextEncoder().encode(text))).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64Url(text: string) {
  const binary = atob(text.replaceAll("-", "+").replaceAll("_", "/"));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

export function inquiryEventKey(date: string, kind: InquiryKind, path: string, at: number, id: string) {
  return `${inquiryEventPrefix}${date}/${kind}/${toBase64Url(path)}/${at}-${id}`;
}

export function parseInquiryEventKey(key: string) {
  const match = key.match(/^inquiry-events\/(\d{4}-\d{2}-\d{2})\/(line|form)\/([A-Za-z0-9_-]+)\/\d{13}-[0-9a-f-]{36}$/);
  if (!match) return null;
  try {
    const path = normalizeInquiryPath(fromBase64Url(match[3]));
    return path ? { date: match[1], kind: match[2] as InquiryKind, path } : null;
  } catch {
    return null;
  }
}

export type InquiryRow = { path: string; line: number; form: number };

/** 依頁面加總，次數多的排前面。 */
export function summarizeInquiryEvents(keys: string[]) {
  const rows = new Map<string, InquiryRow>();
  const totals = { line: 0, form: 0 };
  for (const key of keys) {
    const event = parseInquiryEventKey(key);
    if (!event) continue;
    const row = rows.get(event.path) ?? { path: event.path, line: 0, form: 0 };
    row[event.kind] += 1;
    totals[event.kind] += 1;
    rows.set(event.path, row);
  }
  return {
    totals,
    rows: [...rows.values()].sort((a, b) => b.line + b.form - (a.line + a.form) || a.path.localeCompare(b.path)),
  };
}

/** 前台呼叫：送出一筆紀錄，失敗就算了，不影響客人操作。 */
export function recordInquiry(kind: InquiryKind, path = window.location.pathname) {
  void fetch("/api/inquiry-events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind, path }),
    keepalive: true,
  }).catch(() => {});
}

/** LINE 官方帳號「開啟聊天並預先填好訊息」的連結（只在手機的 LINE App 有效）。 */
export function lineMessageUrl(lineId: string, message: string) {
  return `https://line.me/R/oaMessage/${encodeURIComponent(lineId)}/?${encodeURIComponent(message)}`;
}

/** 「最近 N 天」從哪一天（台灣日期，YYYY-MM-DD）開始算，含今天。 */
export function inquirySinceDate(days: number, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date(now.getTime() - (days - 1) * 86_400_000));
}

/** 行程詢問的 LINE 預填訊息：行程名稱、已選的團期與方案、留空給客人填的欄位，最後附上行程頁網址。 */
export function tripLineMessage({ title, url, departure, plan, waitlist = false }: { title: string; url: string; departure?: string; plan?: string; waitlist?: boolean }) {
  return [
    waitlist ? `你好，我想排候補「${title}」` : `你好，我想詢問「${title}」`,
    departure ? `出發日期：${departure}` : "想出發的月份：",
    plan ? `方案：${plan}` : "",
    "人數：",
    waitlist ? "候補不到的話，也可以推薦相近日期" : "",
    url,
  ]
    .filter(Boolean)
    .join("\n");
}

/** 放在 LINE 按鈕上的屬性；查不到官方帳號 ID 時不加，按鈕維持原本的連結。 */
export function linePrefillAttributes(lineId: string | null, message: string): Record<string, string> {
  return lineId ? { "data-line-id": lineId, "data-line-message": message } : {};
}
