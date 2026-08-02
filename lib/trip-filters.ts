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

// ---------- 全站團期總表 ----------

export type DepartureRow = {
  tripId: string;
  tripTitle: string;
  region: string;
  days: string;
  badge: string;
  documentUrl: string;
  departureId: string;
  date: string;
  price: string;
  monthId: string;
  // UTC 毫秒；日期看不懂時給 Infinity，排序時自然落在最後面。
  time: number;
};

export function parseDepartureDate(value: string) {
  const matched = value.match(/(\d{4})\D{0,2}(\d{1,2})(?:\D{0,2}(\d{1,2}))?/);
  if (!matched) return null;

  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = matched[3] ? Number(matched[3]) : 1;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return { year, month, day, time: Date.UTC(year, month - 1, day) };
}

// 伺服器時區可能是 UTC，出發日要以台北當天為準才不會少一天。
export function taipeiTodayTime() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((all, part) => {
      all[part.type] = part.value;
      return all;
    }, {});

  return Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
  );
}

export function departureRows(trips: Trip[]): DepartureRow[] {
  const rows: DepartureRow[] = [];

  for (const trip of trips) {
    for (const departure of trip.departures) {
      const parsed = parseDepartureDate(departure.date);
      rows.push({
        tripId: trip.id,
        tripTitle: trip.title,
        region: trip.region,
        days: trip.days,
        badge: trip.badge,
        documentUrl: trip.documentUrl,
        departureId: departure.id,
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

// 已經出發過的團期不再顯示；日期格式看不懂的一律保留，交給業務判斷。
export function upcomingDepartureRows(rows: DepartureRow[]) {
  const today = taipeiTodayTime();
  return rows.filter((row) => !Number.isFinite(row.time) || row.time >= today);
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
  if (showAll) params.set("all", "1");

  const query = params.toString();
  return `/${query ? `?${query}` : ""}#journeys`;
}
