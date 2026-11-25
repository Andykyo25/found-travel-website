// IndexNow：內容一改就主動告訴 Bing（以及 Yandex、Naver 等）哪些網址變了，
// 不用等搜尋引擎自己回來爬。Google 不支援 IndexNow，它仍靠 sitemap。
//
// 金鑰本來就是公開的：public/<金鑰>.txt 讓搜尋引擎確認「送網址的人能改這個網站」。
// 換金鑰時，這裡和 public/ 的檔名要一起換。
import type { Trip } from "@/lib/site-content";
import { destinationPath } from "@/lib/destinations";
import { tripPath } from "@/lib/trip-values";

export const indexNowKey = "8f3c73ebf1d57053707aaf11023d16f5";
const endpoint = "https://api.indexnow.org/indexnow";
// IndexNow 單次最多 10,000 個網址。
const maxUrlsPerRequest = 10_000;

type TripLike = Pick<Trip, "id" | "slug" | "badge">;

/**
 * 儲存前後比對，找出要通知的網址：新增、修改、刪除的行程頁，
 * 以及會跟著變的首頁、團期總表與所屬目的地頁。沒有行程變動就回傳空陣列。
 */
export function changedPaths(previous: readonly TripLike[], next: readonly TripLike[]): string[] {
  const before = new Map(previous.map((trip) => [trip.id, trip]));
  const after = new Map(next.map((trip) => [trip.id, trip]));
  const changed: TripLike[] = [];
  for (const trip of next) {
    const old = before.get(trip.id);
    if (!old || JSON.stringify(old) !== JSON.stringify(trip)) changed.push(trip);
    // 改了代稱：舊網址會轉址到新網址，也讓搜尋引擎知道。
    if (old && tripPath(old) !== tripPath(trip)) changed.push(old);
    if (old && old.badge !== trip.badge) changed.push(old);
  }
  for (const trip of previous) if (!after.has(trip.id)) changed.push(trip);
  if (changed.length === 0) return [];

  const paths = new Set(["/", "/dates"]);
  for (const trip of changed) {
    paths.add(tripPath(trip));
    const badge = trip.badge?.trim();
    if (badge) paths.add(destinationPath(badge));
  }
  return [...paths];
}

/** 送出網址。失敗只記錄、不丟錯：通知不到頂多等搜尋引擎自己來爬，不能影響存檔。 */
export async function submitToIndexNow(origin: string, paths: readonly string[]) {
  if (paths.length === 0) return;
  const { host } = new URL(origin);
  const urls = paths.map((path) => new URL(path, origin).href);
  for (let i = 0; i < urls.length; i += maxUrlsPerRequest) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          host,
          key: indexNowKey,
          keyLocation: `${origin}/${indexNowKey}.txt`,
          urlList: urls.slice(i, i + maxUrlsPerRequest),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      // 200 收到、202 收到但金鑰還在驗證，其他都算失敗。
      if (response.status !== 200 && response.status !== 202) {
        console.error(`IndexNow rejected ${urls.length} URLs: HTTP ${response.status}`);
      }
    } catch (error) {
      console.error("IndexNow request failed", error);
    }
  }
}
