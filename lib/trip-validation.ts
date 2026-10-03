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
            .map((p) => p.id || `${p.airline ?? ""} ${p.title ?? ""}`)
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

// 舊版「新增行程」會帶入這些預設字樣；現在改為空白，但已存在或殘留的值仍要擋下，
// 避免把「DESTINATION」或預設封面直接發布到網站。
const placeholderTitles = new Set(["新行程"]);
const placeholderRegions = new Set(["DESTINATION"]);
const placeholderAirlines = new Set(["航空公司待填"]);
const placeholderPlanTitles = new Set(["新行程版本"]);

function blank(value: unknown) {
  return typeof value !== "string" || value.trim() === "";
}

type DraftTrip = {
  title?: unknown;
  days?: unknown;
  badge?: unknown;
  region?: unknown;
  image?: unknown;
  summary?: unknown;
  plans?: unknown;
};

/** 回傳這筆行程還沒填好的欄位名稱（空陣列代表可以發布）。 */
export function tripDraftProblems(trip: DraftTrip): string[] {
  const problems: string[] = [];
  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  if (blank(trip.title) || placeholderTitles.has(text(trip.title))) problems.push("行程名稱");
  if (blank(trip.days)) problems.push("天數");
  if (blank(trip.badge)) problems.push("分類標籤");
  if (blank(trip.region) || placeholderRegions.has(text(trip.region))) problems.push("地區小字");
  if (blank(trip.image)) problems.push("封面圖片");
  if (blank(trip.summary)) problems.push("行程簡介");
  const plans = Array.isArray(trip.plans) ? trip.plans : [];
  const planProblem = plans.some((plan) => {
    const item = (plan ?? {}) as { airline?: unknown; title?: unknown };
    return (
      blank(item.airline) ||
      placeholderAirlines.has(text(item.airline)) ||
      blank(item.title) ||
      placeholderPlanTitles.has(text(item.title))
    );
  });
  if (planProblem) problems.push("航空公司與版本名稱");
  return problems;
}

/** 找出第一筆還沒填完的行程；全部沒問題回傳 null。 */
export function firstUnfinishedTrip(value: unknown) {
  const trips = (value as { trips?: unknown })?.trips;
  if (!Array.isArray(trips)) return null;
  for (const [index, item] of trips.entries()) {
    const trip = (item ?? {}) as DraftTrip & { id?: unknown };
    const problems = tripDraftProblems(trip);
    if (problems.length > 0) {
      const name = typeof trip.title === "string" && trip.title.trim() ? trip.title.trim() : `第 ${index + 1} 筆行程`;
      return {
        id: typeof trip.id === "string" ? trip.id : "",
        index,
        problems,
        message: `「${name}」還有資料沒填完：${problems.join("、")}。請補齊後再儲存。`,
      };
    }
  }
  return null;
}
