/**
 * 把業務系統同步來的團期，套到官網行程上（只在讀取時套用，不改業務存的內容）。
 *
 * 對外只公開：出發日、售價、狀態（即將額滿／額滿／已成團）。不顯示剩餘人數。
 */
import type { SiteContent, Trip, TripDeparture, TripPlan } from "./site-content";
import type { TourFeedStatus } from "./tour-feed-parse";
import { feedAirlineAliases, feedAirlineName, type FeedProduct, type TripMatch } from "./tour-feed-match";

export type FeedSnapshotDeparture = {
  code: string;
  date: string;
  price: number;
  status: TourFeedStatus;
  airline: string;
  from: string;
};

export type FeedSnapshotProduct = {
  key: string;
  file: string;
  region: string;
  name: string;
  days: number;
  departures: FeedSnapshotDeparture[];
};

export type FeedSnapshot = {
  syncedAt: string;
  products: FeedSnapshotProduct[];
  matches: TripMatch[];
};

/** 人工指定：行程 ID → 商品 key；"none" 代表這個行程不要套用同步團期。 */
export type FeedLinks = Record<string, string>;

/** 同步停擺超過這個時間，就不再把舊的餘位狀態當成現況顯示。 */
export const feedStaleAfterMs = 72 * 60 * 60 * 1000;

export function isFeedStale(snapshot: FeedSnapshot, now = Date.now()) {
  return now - Date.parse(snapshot.syncedAt) > feedStaleAfterMs;
}

const statusNotes: Record<TourFeedStatus, string> = { open: "", few: "即將額滿", full: "額滿", confirmed: "已成團" };
const cityNames: Record<string, string> = { 中: "台中出發", 高: "高雄出發", 松: "松山出發" };

export function snapshotProduct(product: FeedProduct): FeedSnapshotProduct {
  return {
    key: product.key,
    file: product.file,
    region: product.region,
    name: product.name,
    days: product.days,
    departures: product.departures
      .map(({ code, date, price, status, airline, from }) => ({ code, date, price, status, airline, from }))
      .sort((a, b) => a.date.localeCompare(b.date) || a.code.localeCompare(b.code)),
  };
}

/** 每個行程實際套用哪個商品：人工指定優先，其次是有把握的自動配對。 */
export function resolveFeedLinks(snapshot: FeedSnapshot, links: FeedLinks): Map<string, string> {
  const known = new Set(snapshot.products.map((product) => product.key));
  const resolved = new Map<string, string>();
  for (const match of snapshot.matches) {
    if (match.status === "auto" && !(match.tripId in links)) resolved.set(match.tripId, match.candidates[0].key);
  }
  for (const [tripId, key] of Object.entries(links)) {
    if (key !== "none" && known.has(key)) resolved.set(tripId, key);
  }
  return resolved;
}

type OverlayDeparture = TripDeparture & { airline: string; from: string };

function feedDepartures(product: FeedSnapshotProduct, todayTime: number): OverlayDeparture[] {
  const used = new Set<string>();
  return product.departures.flatMap((departure) => {
    const [year, month, day] = departure.date.split("/").map(Number);
    if (Date.UTC(year, month - 1, day) < todayTime) return [];
    let id = `feed-${departure.code}`;
    for (let suffix = 2; used.has(id); suffix += 1) id = `feed-${departure.code}-${suffix}`;
    used.add(id);
    const label = [feedAirlineName(departure.airline), cityNames[departure.from]].filter(Boolean).join("・");
    return [{
      id,
      date: label ? `${departure.date}(${label})` : departure.date,
      price: departure.price.toLocaleString("en-US"),
      note: statusNotes[departure.status],
      airline: departure.airline,
      from: departure.from === "松" ? "" : departure.from,
    }];
  });
}

const planCity = (plan: TripPlan) => (/高雄/.test(plan.airline + plan.title) ? "高" : /台中/.test(plan.airline + plan.title) ? "中" : "");

/**
 * 行程有多個版本（不同航空、不同出發地）時，把團期分給相符的版本：
 * 先看出發地，同出發地有航空相符的版本就只給它。分不乾淨就全部版本共用。
 */
function assignPlans(plans: TripPlan[], departures: OverlayDeparture[]): TripPlan[] {
  const shared = plans.map((plan) => ({ ...plan, departureMode: "all" as const, departureIds: [] }));
  if (plans.length < 2) return shared;
  const ids = new Map<string, string[]>(plans.map((plan) => [plan.id, []]));
  for (const departure of departures) {
    const sameCity = plans.filter((plan) => planCity(plan) === departure.from);
    const aliases = feedAirlineAliases(departure.airline);
    const sameAirline = sameCity.filter((plan) => aliases.some((alias) => plan.airline.includes(alias)));
    const targets = sameAirline.length > 0 ? sameAirline : sameCity;
    if (targets.length === 0) return shared;
    for (const plan of targets) ids.get(plan.id)!.push(departure.id);
  }
  if (plans.some((plan) => ids.get(plan.id)!.length === 0)) return shared;
  return plans.map((plan) => ({ ...plan, departureMode: "selected" as const, departureIds: ids.get(plan.id)! }));
}

export function applyTourFeed(content: SiteContent, snapshot: FeedSnapshot | null, links: FeedLinks, todayTime: number, now = Date.now()): SiteContent {
  if (!snapshot || isFeedStale(snapshot, now)) return content;
  const resolved = resolveFeedLinks(snapshot, links);
  if (resolved.size === 0) return content;
  const products = new Map(snapshot.products.map((product) => [product.key, product]));
  return {
    ...content,
    trips: content.trips.map((trip): Trip => {
      const product = products.get(resolved.get(trip.id) ?? "");
      if (!product) return trip;
      const departures = feedDepartures(product, todayTime);
      // 商品還在但已經沒有未來的團：保留業務原本填的內容，不要把行程清空。
      if (departures.length === 0) return trip;
      return {
        ...trip,
        priceMode: "auto",
        plans: assignPlans(trip.plans, departures),
        departures: departures.map(({ id, date, price, note }) => ({ id, date, price, note })),
      };
    }),
  };
}
