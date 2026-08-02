// 首頁行程篩選。全部欄位都是從現有的行程資料推導出來的，
// 沒有另外新增後台欄位。這個檔案不可加 "server-only"，
// 前台的篩選列（client component）會 import 價格級距。
//
// 型別用 import type，編譯後會被完全移除，
// 所以不會把 server-only 的 site-content 帶進瀏覽器。
import type { Trip } from "@/lib/site-content";

export type TripFilters = {
  month: string;
  budget: string;
  category: string;
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
  { id: "b1", label: "NT$30,000 以下", min: 0, max: 30000 },
  { id: "b2", label: "NT$30,000 - 50,000", min: 30000, max: 50000 },
  { id: "b3", label: "NT$50,000 - 80,000", min: 50000, max: 80000 },
  { id: "b4", label: "NT$80,000 以上", min: 80000, max: Number.POSITIVE_INFINITY },
];

export type MonthOption = {
  id: string;
  label: string;
};

// 「NT$36,800 起」→ 36800。取字串中最大的一組數字，
// 避免被「2人成行」這類前綴數字影響。
export function tripPriceValue(trip: Trip) {
  const matches = trip.price.match(/\d[\d,]*/g);
  if (!matches) return null;

  const values = matches
    .map((match) => Number(match.replace(/,/g, "")))
    .filter((value) => Number.isFinite(value));
  if (values.length === 0) return null;

  return Math.max(...values);
}

// 出發日期格式由後台自動整理成 2026/04/02，
// 這裡仍容許其他分隔符號，抓不到年月的就略過。
export function departureMonthIds(trip: Trip) {
  const months = new Set<string>();
  for (const departure of trip.departures) {
    const matched = departure.date.match(/(\d{4})\D{0,2}(\d{1,2})/);
    if (!matched) continue;
    const month = Number(matched[2]);
    if (month < 1 || month > 12) continue;
    months.add(`${matched[1]}-${String(month).padStart(2, "0")}`);
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
  if (trip.departures.length === 0) return "團期洽詢";

  const sortable = trip.departures
    .map((departure) => ({
      date: departure.date,
      value: Number(departure.date.replace(/\D/g, "")),
    }))
    .filter((departure) => Number.isFinite(departure.value))
    .sort((left, right) => left.value - right.value);

  const earliest = sortable[0]?.date ?? trip.departures[0].date;
  return trip.departures.length > 1
    ? `${earliest} 起・${trip.departures.length} 個團期`
    : earliest;
}

export function readTripFilters(params: Record<string, string | string[] | undefined>): TripFilters {
  const read = (key: string) => {
    const value = params[key];
    const raw = Array.isArray(value) ? value[0] : value;
    return typeof raw === "string" ? raw.slice(0, 60) : "";
  };

  return {
    month: read("month"),
    budget: read("budget"),
    category: read("category"),
  };
}

export function filterTrips(trips: Trip[], filters: TripFilters) {
  const bucket = budgetBuckets.find((option) => option.id === filters.budget);

  return trips.filter((trip) => {
    if (filters.category && trip.badge !== filters.category) return false;

    if (filters.month && !departureMonthIds(trip).has(filters.month)) {
      return false;
    }

    if (bucket) {
      const price = tripPriceValue(trip);
      // 價格寫成「請洽詢」這類沒有數字的行程，在指定預算時不列入。
      if (price === null) return false;
      if (price < bucket.min || price >= bucket.max) return false;
    }

    return true;
  });
}

export function tripFilterHref(filters: TripFilters, showAll: boolean) {
  const params = new URLSearchParams();
  if (filters.month) params.set("month", filters.month);
  if (filters.budget) params.set("budget", filters.budget);
  if (filters.category) params.set("category", filters.category);
  if (showAll) params.set("all", "1");

  const query = params.toString();
  return `/${query ? `?${query}` : ""}#journeys`;
}
