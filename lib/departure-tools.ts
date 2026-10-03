// 團期整理工具：過期團期、依日期排序、批次調整價格。
// 全部是不改動輸入的純函式，後台只是把結果放回草稿，儲存前都還能放棄。
import type { Trip } from "./site-content";
import { parseDepartureDate, priceValue } from "./trip-values";

export const priceAdjustmentLimit = 9_999_999;

/** 日期有效且早於今天才算過期；日期打錯的列不算，仍要讓業務看到並修正。 */
export function isExpiredDeparture(departure: { date: string }, todayTime: number) {
  const parsed = parseDepartureDate(departure.date);
  return parsed !== null && parsed.time < todayTime;
}

export function countExpiredDepartures(trip: Pick<Trip, "departures">, todayTime: number) {
  return trip.departures.filter((departure) => isExpiredDeparture(departure, todayTime)).length;
}

/** 移除已過期的團期，並同步從各版本的「指定團期」名單拿掉。 */
export function removeExpiredDepartures(trip: Trip, todayTime: number): { trip: Trip; removed: number } {
  const kept = trip.departures.filter((departure) => !isExpiredDeparture(departure, todayTime));
  const removed = trip.departures.length - kept.length;
  if (removed === 0) return { trip, removed: 0 };
  const keptIds = new Set(kept.map((departure) => departure.id));
  return {
    trip: {
      ...trip,
      departures: kept,
      plans: trip.plans.map((plan) => ({
        ...plan,
        departureIds: plan.departureIds.filter((id) => keptIds.has(id)),
      })),
    },
    removed,
  };
}

/** 依出發日期由近到遠排序；日期無效的列放最後，同一天維持原本順序。 */
export function sortDeparturesByDate(trip: Trip): Trip {
  const ordered = trip.departures
    .map((departure, index) => ({
      departure,
      index,
      time: parseDepartureDate(departure.date)?.time ?? Number.POSITIVE_INFINITY,
    }))
    .sort((a, b) => (a.time === b.time ? a.index - b.index : a.time < b.time ? -1 : 1))
    .map((item) => item.departure);
  return ordered.every((departure, index) => departure === trip.departures[index])
    ? trip
    : { ...trip, departures: ordered };
}

function monthKey(date: string) {
  const parsed = parseDepartureDate(date);
  return parsed ? `${parsed.year}/${String(parsed.month).padStart(2, "0")}` : null;
}

/** 還沒出發的團期涵蓋哪些月份（YYYY/MM，由近到遠）與各月份有幾個團期。 */
export function upcomingMonthCounts(trip: Pick<Trip, "departures">, todayTime: number) {
  const counts = new Map<string, number>();
  for (const departure of trip.departures) {
    const parsed = parseDepartureDate(departure.date);
    if (!parsed || parsed.time < todayTime) continue;
    const key = monthKey(departure.date)!;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
}

export type PriceAdjustment = {
  /** "all" 代表全部還沒出發的團期；或指定月份 "YYYY/MM"。 */
  scope: string;
  mode: "set" | "add" | "subtract";
  amount: number;
};

export type PriceAdjustmentResult = {
  trip: Trip;
  /** 實際會被調整的團期數 */
  changed: number;
  /** 在範圍內但價格不是數字、或調整後不合理（≤ 0）而略過的團期數 */
  skipped: number;
  /** 預覽用：第一個被調整的團期，調整前後的價格 */
  example: { date: string; from: string; to: string } | null;
};

export function isValidAdjustmentAmount(amount: number) {
  return Number.isSafeInteger(amount) && amount > 0 && amount <= priceAdjustmentLimit;
}

/** 只調整還沒出發的團期；已過期的團期保留原價，當作歷史紀錄。 */
export function adjustDeparturePrices(trip: Trip, adjustment: PriceAdjustment, todayTime: number): PriceAdjustmentResult {
  if (!isValidAdjustmentAmount(adjustment.amount)) return { trip, changed: 0, skipped: 0, example: null };
  let changed = 0;
  let skipped = 0;
  let example: PriceAdjustmentResult["example"] = null;
  const departures = trip.departures.map((departure) => {
    const parsed = parseDepartureDate(departure.date);
    if (!parsed || parsed.time < todayTime) return departure;
    if (adjustment.scope !== "all" && monthKey(departure.date) !== adjustment.scope) return departure;

    let next: number;
    if (adjustment.mode === "set") {
      next = adjustment.amount;
    } else {
      const current = priceValue(departure.price);
      if (current === null) {
        skipped += 1;
        return departure;
      }
      next = adjustment.mode === "add" ? current + adjustment.amount : current - adjustment.amount;
    }
    if (!Number.isSafeInteger(next) || next <= 0) {
      skipped += 1;
      return departure;
    }
    const price = next.toLocaleString("en-US");
    if (price === departure.price) return departure;
    changed += 1;
    example ??= { date: departure.date, from: departure.price || "（未填）", to: price };
    return { ...departure, price };
  });
  return { trip: changed === 0 ? trip : { ...trip, departures }, changed, skipped, example };
}
