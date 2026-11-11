/**
 * 行程頁的「行程速覽」與自動問答。
 *
 * AI 搜尋（ChatGPT、Perplexity、Google AI 摘要）回答「這個行程多少錢、什麼時候出發」時，
 * 會找頁面上一句就能引用的事實。行銷文案和一長串團期表都不好引用，
 * 所以這裡把同一份資料整理成完整句子與問答。全部由現有資料算出來，不另外編內容。
 */
import type { SiteContent, Trip, TripFaq } from "./site-content";
import { bookableDepartures, parseDepartureDate, priceValue, upcomingDepartures } from "./trip-values";

export type TripFacts = {
  /** 一段可以單獨引用的摘要。 */
  summary: string;
  items: { label: string; value: string }[];
  faqs: TripFaq[];
};

type FactTrip = Pick<Trip, "title" | "region" | "days" | "price" | "departures" | "plans">;
type FactCompany = Pick<SiteContent, "brandName" | "companyName" | "businessLicense">;

const money = (amount: number) => `NT$${amount.toLocaleString("en-US")}`;

function dateLabel(value: string) {
  const parsed = parseDepartureDate(value);
  return parsed ? `${parsed.year}/${String(parsed.month).padStart(2, "0")}/${String(parsed.day).padStart(2, "0")}` : value;
}

/** 日期後面括號裡的航空（「2026/11/30(亞航・高雄出發)」→ 亞航）；沒有就用方案填的航空。 */
function airlinesOf(trip: FactTrip, upcoming: { date: string }[]) {
  const fromDates = upcoming.flatMap((departure) => {
    const note = parseDepartureDate(departure.date)?.note.replace(/[（()）]/g, "") ?? "";
    const airline = note.split("・")[0];
    return airline && !/出發$/.test(airline) ? [airline] : [];
  });
  const fromPlans = trip.plans
    .map((plan) => plan.airline.replace(/[（(].*$/, "").trim())
    .filter((name) => name && name !== "航空方案");
  return [...new Set(fromDates.length > 0 ? fromDates : fromPlans)].slice(0, 6);
}

const isFull = (note = "") => note.includes("額滿") && !note.includes("即將額滿");

export function tripFacts(trip: FactTrip, company: FactCompany, todayTime: number): TripFacts {
  const upcoming = upcomingDepartures(trip.departures, todayTime);
  const open = upcoming.filter((departure) => !isFull(departure.note));
  const prices = bookableDepartures(trip.departures, todayTime)
    .map((departure) => priceValue(departure.price))
    .filter((amount): amount is number => amount !== null && amount > 0);
  const lowest = prices.length ? Math.min(...prices) : priceValue(trip.price);
  const highest = prices.length ? Math.max(...prices) : null;
  const airlines = airlinesOf(trip, upcoming);
  const today = new Date(todayTime);
  const asOf = `${today.getUTCFullYear()}/${String(today.getUTCMonth() + 1).padStart(2, "0")}/${String(today.getUTCDate()).padStart(2, "0")}`;
  const name = `「${trip.title}」`;
  const kind = [trip.region, trip.days].filter(Boolean).join(" ");
  const organizer = company.companyName || company.brandName;
  const licensed = company.businessLicense ? `${organizer}（${company.businessLicense}）` : organizer;
  const priceText = lowest ? `每人 ${money(lowest)} 起` : "";
  const next = open[0] ? dateLabel(open[0].date) : "";
  const range = upcoming.length > 0 ? `${dateLabel(upcoming[0].date)} 至 ${dateLabel(upcoming[upcoming.length - 1].date)}` : "";
  const flies = airlines.length > 0 ? `搭乘${airlines.join("、")}。` : "";

  const items = [
    { label: "行程", value: [trip.region, trip.days].filter(Boolean).join("・") },
    { label: "團費", value: lowest ? `${priceText}${highest && highest > lowest ? `（最高 ${money(highest)}）` : ""}` : "依出發日期報價" },
    { label: "出發日期", value: upcoming.length > 0 ? `${range}，共 ${upcoming.length} 團` : "由顧問依想出發的月份回覆" },
    ...(upcoming.length > 0
      ? [{ label: "可報名", value: open.length > 0 ? `${open.length} 團${next ? `，最近一團 ${next}` : ""}` : "目前公布的團期皆已額滿，可洽顧問候補或加開" }]
      : []),
    ...(airlines.length > 0 ? [{ label: "航空", value: airlines.join("、") }] : []),
    { label: "出團旅行社", value: [organizer, company.businessLicense].filter(Boolean).join("｜") },
  ].filter((item) => item.value);

  let summary = `${name}是${company.brandName}出團的${kind}團體行程。`;
  if (upcoming.length > 0) {
    summary += `截至 ${asOf}，共公布 ${upcoming.length} 個出發日（${range}），`;
    summary +=
      open.length > 0
        ? `其中 ${open.length} 個仍可報名${priceText ? `，團費${priceText}` : ""}，最近可報名的出發日是 ${next}。`
        : "目前皆已額滿，可洽顧問候補或詢問加開團期。";
  } else {
    summary += `${priceText ? `參考團費${priceText}；` : ""}出發日期與實際團費由顧問依想出發的月份與人數回覆。`;
  }
  summary += flies;

  const faqs: TripFaq[] = [];
  const add = (question: string, answer: string) => faqs.push({ id: `auto-${faqs.length + 1}`, question, answer });

  add(
    `${trip.title}多少錢？`,
    lowest
      ? `${prices.length > 0 ? `截至 ${asOf}，還能報名的團期裡` : "參考"}團費${priceText}${highest && highest > lowest ? `，依出發日期最高 ${money(highest)}` : ""}。實際費用以顧問回覆為準。`
      : `團費依出發日期與人數而定，請透過 LINE 或詢問表單向${company.brandName}的顧問索取報價。`,
  );
  add(
    `${trip.title}什麼時候出發？`,
    upcoming.length > 0
      ? `目前公布 ${upcoming.length} 個出發日，從 ${range}。` +
          (open.length > 0
            ? `最近可報名的是 ${open.slice(0, 5).map((departure) => dateLabel(departure.date)).join("、")}${open.length > 5 ? " 等" : ""}。`
            : "") +
          "完整日期見本頁「出發日期與團費」。"
      : "這個行程的出發日期由顧問依你想出發的月份回覆，可透過 LINE 或詢問表單洽詢。",
  );
  if (airlines.length > 0) add(`${trip.title}搭哪家航空？`, `依出發日期搭乘${airlines.join("、")}，各團期的航空標示在出發日期旁。`);
  add(`怎麼報名${trip.title}？`, `在本頁選好出發日期後按「詢問此團期」，或直接用 LINE 聯絡顧問。行程由${licensed}出團。`);

  return { summary, items, faqs };
}
