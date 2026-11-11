// 後台行程列表與前台共用的行程摘要：起始價格、下一個團期、文件備妥狀態。
// 只 import type，避免把伺服器端的儲存邏輯帶進 client component。
import type { SiteContent, Trip } from "./site-content";
import { formatDepartureDate, priceValue, upcomingDepartures } from "./trip-values";

/** 目前還沒出發的團期裡最低的價格；沒有可判讀的價格時回傳 null。 */
export function lowestUpcomingPrice(trip: Pick<Trip, "departures">, todayTime: number) {
  let lowest: number | null = null;
  for (const departure of upcomingDepartures(trip.departures, todayTime)) {
    const amount = priceValue(departure.price);
    if (amount !== null && amount > 0 && (lowest === null || amount < lowest)) lowest = amount;
  }
  return lowest;
}

export function formatStartPrice(amount: number) {
  return `NT$${amount.toLocaleString("en-US")} 起／人`;
}

/** 實際要顯示的起始價格：自動模式取團期最低價，沒有團期價格時保留原本填的文字。 */
export function resolveTripPrice(trip: Pick<Trip, "departures" | "price" | "priceMode">, todayTime: number) {
  if (trip.priceMode !== "auto") return trip.price;
  const lowest = lowestUpcomingPrice(trip, todayTime);
  return lowest === null ? trip.price : formatStartPrice(lowest);
}

/** 前台讀取內容時套用：自動模式的行程，起始價格永遠跟著目前的團期走（不會因為最低價團期過期而過時）。 */
export function applyAutoPrices(content: SiteContent, todayTime: number): SiteContent {
  if (!content.trips.some((trip) => trip.priceMode === "auto")) return content;
  return {
    ...content,
    trips: content.trips.map((trip) =>
      trip.priceMode === "auto" ? { ...trip, price: resolveTripPrice(trip, todayTime) } : trip,
    ),
  };
}

/**
 * 儲存時替行程記下修改時間：內容和上一版不同（或是新行程）就記這次的時間，沒變的沿用原本的。
 * 以前 sitemap 把全站的儲存時間當成每一頁的更新時間，改一個行程，三百頁都顯示剛更新，搜尋引擎就不再相信它。
 */
export function stampTripUpdates(next: SiteContent, previous: SiteContent | null, now: string): SiteContent {
  const fingerprint = (trip: Trip) => JSON.stringify({ ...trip, updatedAt: undefined });
  const before = new Map((previous?.trips ?? []).map((trip) => [trip.id, trip]));
  return {
    ...next,
    trips: next.trips.map((trip) => {
      const old = before.get(trip.id);
      if (!old || fingerprint(old) !== fingerprint(trip)) return { ...trip, updatedAt: now };
      const unchanged = { ...trip };
      if (old.updatedAt) unchanged.updatedAt = old.updatedAt;
      else delete unchanged.updatedAt;
      return unchanged;
    }),
  };
}

/** 手動填寫的起始價格與團期最低價不一致時，回傳團期最低價（讓後台提醒）；一致或無法比較時回傳 null。 */
export function priceMismatch(trip: Pick<Trip, "departures" | "price" | "priceMode">, todayTime: number) {
  if (trip.priceMode === "auto") return null;
  const lowest = lowestUpcomingPrice(trip, todayTime);
  if (lowest === null) return null;
  return priceValue(trip.price) === lowest ? null : lowest;
}

export type TripListSummary = {
  price: string;
  auto: boolean;
  nextDate: string | null;
  upcomingCount: number;
  totalDepartures: number;
  documentsReady: number;
  documentsTotal: number;
};

/** 收合的行程列要顯示的重點，讓業務不用展開就能掌握這一團的狀態。 */
export function tripListSummary(trip: Trip, todayTime: number): TripListSummary {
  const upcoming = upcomingDepartures(trip.departures, todayTime);
  const next = upcoming[0];
  return {
    price: resolveTripPrice(trip, todayTime),
    auto: trip.priceMode === "auto",
    nextDate: next ? formatDepartureDate(next.date).replace(/\s*[（(].*$/, "") : null,
    upcomingCount: upcoming.length,
    totalDepartures: trip.departures.length,
    documentsReady: trip.plans.filter((plan) => Boolean(plan.documentUrl)).length,
    documentsTotal: trip.plans.length,
  };
}

/**
 * 從 Unsplash 複製的圖片網址帶著 ixlib、ixid 兩個追蹤參數，不影響圖片本身。
 * 每張圖的網址會在 srcset 裡重複好幾次，拿掉後每張圖在頁面裡少掉近一半的字。
 */
export function compactImageUrl(src: string) {
  if (!src.startsWith("https://images.unsplash.com/") && !src.startsWith("https://plus.unsplash.com/")) return src;
  try {
    const url = new URL(src);
    url.searchParams.delete("ixlib");
    url.searchParams.delete("ixid");
    return url.toString();
  } catch {
    return src;
  }
}

/** Unsplash 圖片網址加上縮圖參數；其他來源原樣回傳。後台縮圖不需要載入 1600px 的原圖。 */
export function coverThumbnail(src: string) {
  const value = src.trim();
  if (!value.startsWith("https://images.unsplash.com/")) return value;
  try {
    const url = new URL(value);
    url.searchParams.set("w", "240");
    url.searchParams.set("h", "160");
    url.searchParams.set("fit", "crop");
    url.searchParams.set("q", "60");
    return url.toString();
  } catch {
    return value;
  }
}
