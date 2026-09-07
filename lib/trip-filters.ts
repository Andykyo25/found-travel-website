// 首頁行程篩選。全部欄位都是從現有的行程資料推導出來的，
// 沒有另外新增後台欄位。這個檔案不可加 "server-only"，
// 前台的篩選列（client component）會 import 價格級距。
//
// 型別用 import type，編譯後會被完全移除，
// 所以不會把 server-only 的 site-content 帶進瀏覽器。
import type { Trip } from "@/lib/site-content";
import { plansForDeparture } from "@/lib/trip-plans";
import {
  parseDepartureDate,
  taipeiTodayTime,
  upcomingDepartures,
  priceValue,
  formatDepartureDate,
} from "@/lib/trip-values";
export { parseDepartureDate, taipeiTodayTime } from "@/lib/trip-values";

export type TripFilters = {
  month: string;
  budget: string;
  category: string;
  region?: string;
};

export const emptyTripFilters: TripFilters = {
  month: "",
  budget: "",
  category: "",
};

export type BudgetBucket = {
  id: string;
  label: string;
  min: number;
  max: number;
};

export const budgetBuckets: BudgetBucket[] = [
  { id: "b1", label: "未滿 NT$30,000", min: 0, max: 30000 },
  { id: "b2", label: "NT$30,000–49,999", min: 30000, max: 50000 },
  { id: "b3", label: "NT$50,000–79,999", min: 50000, max: 80000 },
  {
    id: "b4",
    label: "NT$80,000 以上",
    min: 80000,
    max: Number.POSITIVE_INFINITY,
  },
];

export type MonthOption = {
  id: string;
  label: string;
};

// 價格與航空、連假等備註分開解析。
export function tripPriceValue(trip: Trip) {
  return priceValue(trip.price);
}

// 出發日期格式由後台自動整理成 2026/04/02，
// 這裡仍容許其他分隔符號，抓不到年月的就略過。
export function departureMonthIds(trip: Trip) {
  const months = new Set<string>();
  for (const departure of upcomingDepartures(trip.departures)) {
    const parsed = parseDepartureDate(departure.date)!;
    months.add(`${parsed.year}-${String(parsed.month).padStart(2, "0")}`);
  }
  return months;
}

export function monthOptions(trips: Trip[]): MonthOption[] {
  const ids = new Set<string>();
  for (const trip of trips) {
    for (const id of departureMonthIds(trip)) ids.add(id);
  }

  return [...ids].sort().map((id) => {
    const [year, month] = id.split("-");
    return { id, label: `${year} 年 ${Number(month)} 月` };
  });
}

export function categoryOptions(trips: Trip[]) {
  const categories: string[] = [];
  for (const trip of trips) {
    if (trip.badge && !categories.includes(trip.badge)) {
      categories.push(trip.badge);
    }
  }
  return categories;
}

export function nextDepartureLabel(trip: Trip) {
  const departures = upcomingDepartures(trip.departures);
  if (!departures.length) return "團期洽詢";
  return `${formatDepartureDate(departures[0].date)} 起・${departures.length} 個團期`;
}

export function readTripFilters(
  params: Record<string, string | string[] | undefined>,
): TripFilters {
  const read = (key: string) => {
    const value = params[key];
    const raw = Array.isArray(value) ? value[0] : value;
    return typeof raw === "string" ? raw.slice(0, 60) : "";
  };

  return {
    month: read("month"),
    budget: read("budget"),
    category: read("category"),
    region: read("region"),
  };
}

export function filterTrips(trips: Trip[], filters: TripFilters) {
  const bucket = budgetBuckets.find((option) => option.id === filters.budget);

  return trips.filter((trip) => {
    if (filters.category && trip.badge !== filters.category) return false;
    if (filters.region && trip.region !== filters.region) return false;

    if (filters.month && !departureMonthIds(trip).has(filters.month)) {
      return false;
    }

    if (bucket) {
      const applicable = upcomingDepartures(trip.departures).filter(
        (departure) => {
          const parsed = parseDepartureDate(departure.date)!;
          return (
            !filters.month ||
            `${parsed.year}-${String(parsed.month).padStart(2, "0")}` ===
              filters.month
          );
        },
      );
      const prices =
        trip.departures.length > 0
          ? applicable.map((departure) =>
              priceValue(departure.price || trip.price),
            )
          : [tripPriceValue(trip)];
      if (
        !prices.some(
          (price) =>
            price !== null && price >= bucket.min && price < bucket.max,
        )
      )
        return false;
    }

    return true;
  });
}

// ---------- 全站團期總表 ----------

export type DepartureRow = {
  tripId: string;
  tripTitle: string;
  region: string;
  days: string;
  badge: string;
  documentUrl: string;
  planCount: number;
  departureId: string;
  details: string;
  date: string;
  price: string;
  monthId: string;
  // UTC 毫秒；日期看不懂時給 Infinity，排序時自然落在最後面。
  time: number;
};

export function departureRows(trips: Trip[]): DepartureRow[] {
  const rows: DepartureRow[] = [];

  for (const trip of trips) {
    for (const departure of trip.departures) {
      const parsed = parseDepartureDate(departure.date);
      const plans = plansForDeparture(trip.plans, departure.id);
      rows.push({
        tripId: trip.id,
        tripTitle: trip.title,
        region: trip.region,
        days: trip.days,
        badge: trip.badge,
        documentUrl: plans.length === 1 ? plans[0].documentUrl : "",
        planCount: plans.length,
        departureId: departure.id,
        details: [
          departure.note,
          ...plans.map((plan) => `${plan.airline}・${plan.title}`),
        ]
          .filter(Boolean)
          .join(" / "),
        date: departure.date,
        price: departure.price,
        monthId: parsed
          ? `${parsed.year}-${String(parsed.month).padStart(2, "0")}`
          : "",
        time: parsed ? parsed.time : Number.POSITIVE_INFINITY,
      });
    }
  }

  return rows.sort((left, right) => left.time - right.time);
}

// 公開列表排除已出發和無法辨識的日期；原始資料留在後台供業務修正。
export function upcomingDepartureRows(rows: DepartureRow[]) {
  const today = taipeiTodayTime();
  return rows.filter((row) => Number.isFinite(row.time) && row.time >= today);
}

export type DepartureMonthOption = {
  id: string;
  label: string;
  shortLabel: string;
  count: number;
};

export function departureMonthOptions(
  rows: DepartureRow[],
): DepartureMonthOption[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.monthId) continue;
    counts.set(row.monthId, (counts.get(row.monthId) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, count]) => {
      const [year, month] = id.split("-");
      return {
        id,
        label: `${year} 年 ${Number(month)} 月`,
        shortLabel: `${year}/${Number(month)}`,
        count,
      };
    });
}

export function groupDeparturesByMonth(rows: DepartureRow[]) {
  const groups: Array<{ id: string; label: string; rows: DepartureRow[] }> = [];

  for (const row of rows) {
    const id = row.monthId;
    const last = groups[groups.length - 1];
    if (last && last.id === id) {
      last.rows.push(row);
      continue;
    }

    const [year, month] = id.split("-");
    groups.push({
      id,
      label: id ? `${year} 年 ${Number(month)} 月` : "日期待確認",
      rows: [row],
    });
  }

  return groups;
}

export function tripFilterHref(filters: TripFilters, showAll: boolean) {
  const params = new URLSearchParams();
  if (filters.month) params.set("month", filters.month);
  if (filters.budget) params.set("budget", filters.budget);
  if (filters.category) params.set("category", filters.category);
  if (filters.region) params.set("region", filters.region);
  if (showAll) params.set("all", "1");

  const query = params.toString();
  return `/${query ? `?${query}` : ""}#journeys`;
}
