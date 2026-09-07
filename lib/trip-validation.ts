import { parseDepartureDate, priceValue } from "./trip-values.ts";

export function validateTripDates(value: unknown): string | null {
  if (
    !value ||
    typeof value !== "object" ||
    !Array.isArray((value as { trips?: unknown }).trips)
  )
    return "缺少行程資料";
  for (const item of (value as { trips: unknown[] }).trips) {
    if (!item || typeof item !== "object") return "行程格式不正確";
    const trip = item as {
      title?: string;
      departures?: unknown;
      plans?: unknown;
    };
    if (!Array.isArray(trip.departures)) return "缺少團期資料";
    const seen = new Map<string, number | null>();
    for (const [index, item] of trip.departures.entries()) {
      if (!item || typeof item !== "object") return "團期格式不正確";
      const departure = item as {
        id?: string;
        date?: unknown;
        price?: unknown;
        note?: unknown;
      };
      const parsed =
        typeof departure.date === "string"
          ? parseDepartureDate(departure.date)
          : null;
      if (!parsed) {
        return `「${trip.title ?? "未命名行程"}」第 ${index + 1} 筆團期日期無效，請使用 YYYY/MM/DD（可附航空備註），或移除空白列`;
      }
      const labels = Array.isArray(trip.plans)
        ? trip.plans
            .filter(
              (p) =>
                p &&
                typeof p === "object" &&
                p.departureMode === "selected" &&
                Array.isArray(p.departureIds) &&
                p.departureIds.includes(departure.id),
            )
            .map((p) => `${p.airline ?? ""} ${p.title ?? ""}`)
            .sort()
            .join("、")
        : "";
      const key = `${parsed.time}|${parsed.note}|${typeof departure.note === "string" ? departure.note.trim() : ""}|${labels}`;
      const price =
        typeof departure.price === "string"
          ? priceValue(departure.price)
          : null;
      if (seen.has(key) && seen.get(key) !== price)
        return `「${trip.title}」第 ${index + 1} 筆與同日團期價格不同，請填寫不同的團期備註或指定不同航空方案`;
      seen.set(key, price);
    }
  }
  return null;
}
