// 目的地頁（/destinations/japan）：把同一個「行程分類」的行程列在一個固定網址上。
//
// 首頁的 /?category=日本 也看得到同一批行程，但那是首頁的篩選狀態，canonical 指回首頁，
// 搜尋引擎不會收錄；大部分行程也只能從那裡或 sitemap 被找到。這裡給每個分類一個自己的頁面，
// 行程頁、頁尾都連過來，行程之間才有連結可循。
//
// 分類沿用後台的「行程分類」欄位（trip.badge），不另外維護一份清單。只 import type 與純函式。
import type { Trip } from "@/lib/site-content";
import { priceValue, upcomingDepartures } from "@/lib/trip-values";

// 網址用英文代稱；清單裡沒有的分類直接用分類名稱當網址（中文網址一樣能用）。
const slugByCategory: Record<string, string> = {
  日本: "japan",
  韓國: "korea",
  越南: "vietnam",
  泰國: "thailand",
  東南亞: "southeast-asia",
  海島: "islands",
  港澳: "hong-kong-macau",
  中國: "china",
  歐洲: "europe",
  東歐: "eastern-europe",
  北歐: "northern-europe",
  中歐: "central-europe",
  西歐: "western-europe",
  南歐: "southern-europe",
  中東非洲: "middle-east-africa",
  美洲: "americas",
  美加: "usa-canada",
  紐澳: "australia-new-zealand",
  郵輪: "cruises",
};

export type TripDestination = {
  /** 分類名稱，例如「日本」。 */
  name: string;
  slug: string;
  path: string;
  trips: Trip[];
  /** 依後台填的地區分組；有公布團期的行程排在前面。 */
  regions: { name: string; trips: Trip[] }[];
  /** 已公布未來團期的行程數。 */
  datedCount: number;
  /** 未來團期裡最低的團費；沒有可判讀的價格時是 null。 */
  lowestPrice: number | null;
};

export function destinationSlug(category: string) {
  return slugByCategory[category] ?? category.trim().replace(/[\s/?#%]+/g, "-");
}

export function destinationPath(category: string) {
  return `/destinations/${destinationSlug(category)}`;
}

/** 「日本旅遊行程」：頁面標題與連結文字共用。 */
export function destinationTitle(name: string) {
  return /旅遊|行程/.test(name) ? name : `${name}旅遊行程`;
}

export function tripDestinations(trips: Trip[], today?: number): TripDestination[] {
  const byCategory = new Map<string, Trip[]>();
  for (const trip of trips) {
    const category = trip.badge?.trim();
    if (!category) continue;
    byCategory.set(category, [...(byCategory.get(category) ?? []), trip]);
  }
  return [...byCategory].map(([name, list]) => {
    const dated = new Set(list.filter((trip) => upcomingDepartures(trip.departures, today).length > 0));
    const ordered = [...list.filter((trip) => dated.has(trip)), ...list.filter((trip) => !dated.has(trip))];
    const regions = new Map<string, Trip[]>();
    for (const trip of ordered) {
      const region = trip.region.trim() || name;
      regions.set(region, [...(regions.get(region) ?? []), trip]);
    }
    const prices = list
      .flatMap((trip) => upcomingDepartures(trip.departures, today).map((departure) => priceValue(departure.price)))
      .filter((amount): amount is number => amount !== null && amount > 0);
    return {
      name,
      slug: destinationSlug(name),
      path: destinationPath(name),
      trips: ordered,
      regions: [...regions].map(([region, regionTrips]) => ({ name: region, trips: regionTrips })),
      datedCount: dated.size,
      lowestPrice: prices.length ? Math.min(...prices) : null,
    };
  });
}

/** 網址片段解碼；編碼不完整就照原樣回傳（比對不到會是 404）。 */
export function decodePathSegment(key: string) {
  try {
    return decodeURIComponent(key);
  } catch {
    return key;
  }
}

/** 網址上的代稱（或直接打分類名稱）找到對應的目的地。 */
export function findTripDestination(destinations: TripDestination[], key: string) {
  const decoded = decodePathSegment(key);
  return destinations.find((destination) => destination.slug === decoded) ?? destinations.find((destination) => destination.name === decoded);
}

/** 頁面開頭的介紹，也拿來當搜尋結果的描述：只寫資料算得出來的事實。 */
export function destinationIntro(destination: TripDestination) {
  const { name, trips, regions, datedCount, lowestPrice } = destination;
  const places = regions.map((region) => region.name).filter((region) => region !== name);
  const coverage = places.length > 1 ? `，涵蓋${places.slice(0, 6).join("、")}${places.length > 6 ? "等地" : ""}` : "";
  const dated =
    datedCount > 0
      ? `${datedCount === trips.length ? "全部" : `其中 ${datedCount} 個`}已公布出發日期${lowestPrice ? `，團費 NT$${lowestPrice.toLocaleString("en-US")} 起` : ""}`
      : "";
  const enquiry = datedCount < trips.length ? `${datedCount > 0 ? "其餘" : ""}行程的團期與報價可直接向顧問洽詢` : "";
  return `找到了旅行社目前有 ${trips.length} 個${name}行程${coverage}。${[dated, enquiry].filter(Boolean).join("；")}。`;
}

/**
 * 行程頁底下的「同地區其他行程」：先找同一個地區，不夠再補同分類的，
 * 讓每個行程頁都連得到幾個相近的行程。
 */
export function relatedTrips(trips: Trip[], trip: Trip, limit = 6) {
  const others = trips.filter((item) => item.id !== trip.id);
  const sameRegion = others.filter((item) => item.region === trip.region);
  const sameCategory = others.filter((item) => item.badge && item.badge === trip.badge && item.region !== trip.region);
  return [...sameRegion, ...sameCategory].slice(0, limit);
}
