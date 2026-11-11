import "server-only";
import { getSiteContentWithMeta } from "./site-content";
import { parseTourFeed } from "./tour-feed-parse";
import { buildFeedProducts, matchTrips } from "./tour-feed-match";
import { snapshotProduct, type FeedSnapshot } from "./tour-feed-overlay";
import { saveTourFeedSnapshot } from "./tour-feed-store";
import { taipeiTodayTime } from "./trip-values";

/**
 * 從業務系統抓團期。業務系統用 Firebase 登入，所以先用專用帳號換一張短效憑證，
 * 再向它的後端要「動態檔清單」和每個檔的文字內容。
 *
 * 需要的環境變數（都只放在 Railway Variables）：
 * TOUR_FEED_EMAIL / TOUR_FEED_PASSWORD：專用帳號
 * TOUR_FEED_API_KEY：業務系統網頁用的 Firebase 金鑰
 * TOUR_FEED_API_URL：業務系統後端網址
 */
function feedConfig() {
  const email = process.env.TOUR_FEED_EMAIL?.trim();
  const password = process.env.TOUR_FEED_PASSWORD;
  const apiKey = process.env.TOUR_FEED_API_KEY?.trim();
  const apiUrl = process.env.TOUR_FEED_API_URL?.trim().replace(/\/+$/, "");
  return email && password && apiKey && apiUrl?.startsWith("https://") ? { email, password, apiKey, apiUrl } : null;
}

export function isTourFeedConfigured() {
  return feedConfig() !== null;
}

// 郵輪與國旅的檔排版不同，目前不處理。
const skippedFiles = /國\s*旅|ＭＳＣ|MSC|麗星/;
const requestTimeoutMs = 30_000;

/** 同步失敗的原因。訊息會顯示在後台給業務看，所以不放帳號、密碼或憑證。 */
export class TourFeedError extends Error {}

async function request(step: string, url: string, init: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(requestTimeoutMs), cache: "no-store" });
  } catch {
    throw new TourFeedError(`${step}：連不上業務系統`);
  }
  if (response.ok) return response;
  // Google 登入失敗時會回一個錯誤代碼（例如 INVALID_LOGIN_CREDENTIALS），只取那個代碼。
  const detail = await response.text().then((body) => /"message":\s*"([A-Z_]{3,60})/.exec(body)?.[1] ?? "", () => "");
  throw new TourFeedError(`${step}：業務系統回應 ${response.status}${detail ? `（${detail}）` : ""}`);
}

async function fetchJson(step: string, url: string, init: RequestInit): Promise<unknown> {
  const response = await request(step, url, init);
  try {
    return await response.json();
  } catch {
    throw new TourFeedError(`${step}：回應格式不是預期的樣子`);
  }
}

async function signIn(config: NonNullable<ReturnType<typeof feedConfig>>) {
  // 這把金鑰是給業務系統的網頁用的，可能限定來源網址，所以帶上和網頁相同的來源。
  const origin = process.env.TOUR_FEED_ORIGIN?.trim() || "https://chrome-unity-464501-j7.web.app";
  const result = (await fetchJson(
    "登入",
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(config.apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json", origin, referer: `${origin}/` },
      body: JSON.stringify({ email: config.email, password: config.password, returnSecureToken: true }),
    },
  )) as { idToken?: unknown };
  if (typeof result.idToken !== "string") throw new TourFeedError("登入：沒有拿到憑證");
  return result.idToken;
}

let running: Promise<FeedSnapshot> | null = null;

async function runSync(): Promise<FeedSnapshot> {
  const config = feedConfig();
  if (!config) throw new TourFeedError("尚未設定業務系統的連線資訊");
  const headers = { Authorization: `Bearer ${await signIn(config)}` };
  const list = (await fetchJson("讀取檔案清單", `${config.apiUrl}/api/sales-files`, { headers })) as { id?: unknown; name?: unknown }[];
  if (!Array.isArray(list)) throw new TourFeedError("讀取檔案清單：回應格式不是預期的樣子");

  const now = new Date();
  const files: Parameters<typeof buildFeedProducts>[0] = [];
  for (const entry of list) {
    if (typeof entry.id !== "string" || typeof entry.name !== "string" || skippedFiles.test(entry.name)) continue;
    // 檔案內容是純文字，不是 JSON。
    const text = await (await request("讀取動態檔", `${config.apiUrl}/api/file-content/${encodeURIComponent(entry.id)}`, { headers })).text();
    // 原始文字含旅客姓名與利潤：解析完就丟，只留日期、售價、狀態。
    files.push({ name: entry.name, groups: parseTourFeed(text, now) });
  }

  const products = buildFeedProducts(files, taipeiTodayTime(now));
  // 一次抓不到半個團多半是對方改了格式或登入出問題；寧可沿用上一次的結果，也不要把官網團期清空。
  if (products.length === 0) throw new TourFeedError("動態檔裡讀不到任何團期，可能是格式改了");
  const { content } = await getSiteContentWithMeta();
  const snapshot: FeedSnapshot = {
    syncedAt: now.toISOString(),
    products: products.map(snapshotProduct),
    matches: matchTrips(content.trips, products),
  };
  await saveTourFeedSnapshot(snapshot);
  return snapshot;
}

/** 同一時間只跑一次；排程和後台的「立即同步」撞在一起時共用同一次結果。 */
export function syncTourFeed(): Promise<FeedSnapshot> {
  running ??= runSync().finally(() => {
    running = null;
  });
  return running;
}
