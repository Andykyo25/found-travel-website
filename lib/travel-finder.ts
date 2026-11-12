import type { Trip, TripPlan, TripDeparture } from "@/lib/site-content";
import { publishedTripPlans, departuresForPlan, tripPlanLabel } from "@/lib/trip-plans";
import { upcomingDepartures, parseDepartureDate, taipeiTodayTime } from "@/lib/trip-values";
import { destinationGroupNames, tripDestinationGroup } from "@/lib/destination-groups";
import { compactImageUrl } from "@/lib/trip-summary";

import { departureAirport, priceBasis, serviceType } from "@/lib/travel-facts";

export const serviceLabels = { group: "跟團旅行", custom: "自組／客製團", partial: "機票／機加酒／包車", undecided: "還沒決定／其他需求" };
export const basisLabels = { person: "每人", room: "每房", group: "整團", unknown: "" };
export type TravelNeeds = {
  service: keyof typeof serviceLabels;
  destination: string;
  start: string;
  end: string;
  budget: string;
  airport: string;
  people: string;
  details: string;
  returnDate: string;
  luggage: string;
  stayTransport: string;
};
export const emptyNeeds: TravelNeeds = { service: "group", destination: "", start: "", end: "", budget: "", airport: "", people: "", details: "", returnDate: "", luggage: "", stayTransport: "" };
/**
 * departures 是符合條件的團期；還沒公布團期的行程（openCandidates）這裡是空陣列。
 * unconfirmed 是旅客填了、但資料不足以判定的條件，卡片上要明講，不能看起來像已符合。
 * moreVersions：沒有團期的行程一個行程只出一張卡，其餘符合的版本數記在這裡。
 */
export type TravelCandidate = { key: string; trip: Trip; plan: TripPlan; departures: TripDeparture[]; reasons: string[]; pending: string[]; unconfirmed: string[]; needsConfirmation: boolean; moreVersions: number };

// A lower bound, range, or conditional price cannot prove a hard budget ceiling.
// 價格後面的括號備註（過年、228連假）不影響金額；備註裡寫「起」就不是確定價。
export function exactTwdPrice(value: string) {
  const match = value.trim().match(/^(?:NT\$|TWD)?\s*(\d{1,3}(?:,\d{3})+|\d+)\s*(?:元)?\s*(?:[／/]人)?\s*(?:[（(][^）)起]*[）)])?$/i);
  const amount = match ? Number(match[1].replaceAll(",", "")) : 0;
  return amount > 0 ? amount : null;
}

// 每人預算上限對一個價格的判定：符合、確定超過，或文字不足以判斷。
function budgetFit(plan: TripPlan, price: string, budget: number): "within" | "over" | "unsure" {
  if (priceBasis(plan, price) !== "person") return "unsure";
  const amount = exactTwdPrice(price);
  if (amount !== null) return amount <= budget ? "within" : "over";
  // A clearly stated per-person starting price above the ceiling is still
  // out of budget; a lower starting price does not prove the final price.
  const starting = price.includes("起") ? exactTwdPrice(price.replace("起", "")) : null;
  return starting !== null && starting > budget ? "over" : "unsure";
}

/**
 * 送到瀏覽器做配對的行程資料：只留配對與結果卡片用得到的欄位、已公布的版本與還沒出發的團期。
 * 整份行程資料（每日行程、完整摘要、文件名稱…）有近三百個行程時約 480 KB，不必全部送出去。
 */
export function finderTrips(trips: Trip[], today = taipeiTodayTime()): Trip[] {
  return trips.map(trip => ({
    id: trip.id,
    ...(trip.slug ? { slug: trip.slug } : {}),
    featured: false,
    // 分類要留著：目的地的大方向是照後台分類歸的。
    badge: trip.badge,
    region: trip.region,
    days: trip.days,
    title: trip.title,
    summary: "",
    price: trip.price,
    image: compactImageUrl(trip.image || ""),
    departures: upcomingDepartures(trip.departures, today),
    plans: publishedTripPlans(trip).map(plan => ({
      id: plan.id,
      airline: plan.airline,
      title: plan.title,
      summary: plan.summary,
      ...(plan.flight ? { flight: plan.flight } : {}),
      ...(plan.accommodation ? { accommodation: plan.accommodation } : {}),
      ...(plan.serviceType && plan.serviceType !== "unknown" ? { serviceType: plan.serviceType } : {}),
      ...(plan.departureAirport ? { departureAirport: plan.departureAirport } : {}),
      ...(plan.priceBasis && plan.priceBasis !== "unknown" ? { priceBasis: plan.priceBasis } : {}),
      price: plan.price,
      documentType: plan.documentType,
      documentUrl: plan.documentUrl,
      documentName: "",
      departureMode: plan.departureMode,
      departureIds: plan.departureIds,
    })),
  }));
}

/** 目的地可以是大方向（日本）或後台填的地區（東京）。 */
export function matchesDestination(trip: Pick<Trip, "badge" | "region">, wanted: string) {
  return !wanted || trip.region === wanted || tripDestinationGroup(trip) === wanted;
}

export function validateNeeds(needs: TravelNeeds) {
  const start = needs.start ? parseDepartureDate(needs.start) : null;
  const end = needs.end ? parseDepartureDate(needs.end) : null;
  if ((needs.start && !start) || (needs.end && !end)) return "請填寫有效日期。";
  if (start && end && start.time > end.time) return "最晚出發日不能早於最早出發日。";
  if (needs.service === "partial" && needs.returnDate) {
    const back = parseDepartureDate(needs.returnDate);
    if (!back || (start && back.time < start.time)) return "回程日期須為有效日期，且不能早於最早出發日。";
  }
  if (needs.budget && (!/^\d+$/.test(needs.budget) || Number(needs.budget) <= 0)) return "每人預算上限請填正整數。";
  if (needs.people && (!/^\d+$/.test(needs.people) || Number(needs.people) < 1 || Number(needs.people) > 999)) return "同行人數請填 1～999 人，未決定可留空。";
  return "";
}

const priceUnsure = "每人價格能否符合預算待確認";

export function findTravel(trips: Trip[], needs: TravelNeeds, today = taipeiTodayTime()) {
  const candidates: TravelCandidate[] = [];
  const pendingCandidates: TravelCandidate[] = [];
  // 還沒公布團期的行程：條件對得上就列出來讓旅客洽詢，但和有團期的結果分開。
  const openCandidates: TravelCandidate[] = [];
  const excluded = { service: 0, destination: 0, airport: 0, date: 0, budget: 0 };
  if (validateNeeds(needs)) return { candidates, pendingCandidates, openCandidates, excluded };
  const start = parseDepartureDate(needs.start)?.time;
  const end = parseDepartureDate(needs.end)?.time;
  const budget = needs.budget ? Number(needs.budget) : null;
  for (const trip of trips) {
    const tripHasDates = upcomingDepartures(trip.departures, today).length > 0;
    const open: { plan: TripPlan; missing: string[]; reasons: string[]; pending: string[] }[] = [];
    for (const plan of publishedTripPlans(trip)) {
      const service = serviceType(plan);
      const airport = departureAirport(plan);
      const missing: string[] = [];
      if (needs.service !== "undecided" && service !== needs.service) {
        if (service !== "unknown" || needs.service !== "group") { excluded.service++; continue; }
        // Legacy catalogue plans remain browseable without a service tag.
      }
      if (!matchesDestination(trip, needs.destination)) { excluded.destination++; continue; }
      if (needs.airport && airport !== needs.airport) {
        if (airport) { excluded.airport++; continue; }
        missing.push(`能否從${needs.airport}出發待確認`);
      }
      const matched = [...(needs.service !== "undecided" && service === needs.service ? [serviceLabels[needs.service]] : []), ...(needs.destination ? [`目的地：${needs.destination}`] : []), ...(needs.airport && airport === needs.airport ? [`出發機場：${airport}`] : [])];
      const always = [...(!airport && !needs.airport ? ["出發機場待確認"] : []), ...(!plan.accommodation ? ["住宿待確認"] : [])];
      const departures = upcomingDepartures(departuresForPlan(trip.departures, plan), today).filter(d => {
        const time = parseDepartureDate(d.date)!.time;
        return (start === undefined || time >= start) && (end === undefined || time <= end);
      });
      if (!departures.length) {
        // 整個行程都還沒公布團期時仍可洽詢。旅客指定了出發日，或只是這個版本、
        // 這段日期沒有團，就不能當作符合。
        if (tripHasDates || start !== undefined || end !== undefined) { excluded.date++; continue; }
        const fit = budget === null ? null : budgetFit(plan, plan.price || trip.price, budget);
        if (fit === "over") { excluded.budget++; continue; }
        if (fit === "unsure") missing.push(priceUnsure);
        open.push({ plan, missing, reasons: [...matched, ...(fit === "within" ? ["已列價格在每人預算內"] : [])], pending: [...missing, "團期尚未公布，出發日、團位與報價須由顧問確認", ...always] });
        continue;
      }
      const confirmed: TripDeparture[] = [];
      const unsure: TripDeparture[] = [];
      for (const d of departures) {
        const fit = budget === null ? "within" : budgetFit(plan, d.price || plan.price || trip.price, budget);
        if (fit === "within") confirmed.push(d);
        else if (fit === "unsure") unsure.push(d);
      }
      if (!confirmed.length && !unsure.length) { excluded.budget++; continue; }
      // Prefer only known-compatible dates. Unknown prices are offered separately
      // when there are no confirmed dates; never mix them into a matched result.
      const usable = confirmed.length ? confirmed : unsure;
      if (budget !== null && !confirmed.length) missing.push(priceUnsure);
      const reasons = ["有已公布的未來團期", ...matched, ...(needs.start || needs.end ? ["出發日在指定範圍內"] : []), ...(budget !== null && confirmed.length ? ["已列價格在每人預算內"] : [])];
      const pending = [...missing, "團位、最終報價與特殊需求須由顧問確認", ...always];
      const candidate = { key: `${trip.id}/${plan.id}`, trip, plan, departures: usable, reasons, pending, unconfirmed: missing, needsConfirmation: missing.length > 0, moreVersions: 0 };
      (missing.length ? pendingCandidates : candidates).push(candidate);
    }
    if (open.length) {
      // 沒有團期可比較時，同一個行程的各版本擠在一起只會洗版：出一張卡，其餘版本到行程頁看。
      const best = open.find(item => !item.missing.length) ?? open[0];
      openCandidates.push({ key: `${trip.id}/${best.plan.id}`, trip, plan: best.plan, departures: [], reasons: best.reasons, pending: best.pending, unconfirmed: best.missing, needsConfirmation: best.missing.length > 0, moreVersions: open.length - 1 });
    }
  }
  const compare = (a: TravelCandidate, b: TravelCandidate) => parseDepartureDate(a.departures[0].date)!.time - parseDepartureDate(b.departures[0].date)!.time || a.key.localeCompare(b.key);
  candidates.sort(compare); pendingCandidates.sort(compare);
  // 條件都確認得了的排前面，其餘維持後台的行程順序。
  openCandidates.sort((a, b) => Number(a.needsConfirmation) - Number(b.needsConfirmation));
  return { candidates, pendingCandidates, openCandidates, excluded };
}

function matchedTrips(trips: Trip[], needs: TravelNeeds, today: number) {
  const result = findTravel(trips, needs, today);
  return [...new Map([...result.candidates, ...result.pendingCandidates, ...result.openCandidates].map(c => [c.trip.id, c.trip])).values()];
}

export type DestinationOption = { group: string; count: number; regions: { name: string; count: number }[] };

/** 目的地選項：只列這種旅行方式真的找得到行程的方向，附行程數，點了不會落空。 */
export function destinationOptions(trips: Trip[], service: TravelNeeds["service"], today = taipeiTodayTime()): DestinationOption[] {
  const groups = new Map<string, Map<string, number>>();
  for (const trip of matchedTrips(trips, { ...emptyNeeds, service }, today)) {
    const region = trip.region.trim();
    if (!region) continue;
    const group = tripDestinationGroup(trip);
    const regions = groups.get(group) ?? new Map<string, number>();
    regions.set(region, (regions.get(region) ?? 0) + 1);
    groups.set(group, regions);
  }
  return [...groups]
    .sort(([a], [b]) => destinationGroupNames.indexOf(a) - destinationGroupNames.indexOf(b))
    .map(([group, regions]) => ({ group, count: [...regions.values()].reduce((sum, n) => sum + n, 0), regions: [...regions].map(([name, count]) => ({ name, count })) }));
}

export type RelaxOption = { label: string; patch: Partial<TravelNeeds>; count: number };

/** 沒有結果時，放寬哪一項條件就找得到行程。只回傳真的有結果的選項，並附行程數。 */
export function relaxOptions(trips: Trip[], needs: TravelNeeds, today = taipeiTodayTime()): RelaxOption[] {
  const custom = needs.service === "custom" || needs.service === "partial";
  const single: Omit<RelaxOption, "count">[] = [
    ...(needs.destination ? [{ label: "不限目的地", patch: { destination: "" } }] : []),
    ...(needs.start || needs.end ? [{ label: "不限出發日", patch: { start: "", end: "" } }] : []),
    ...(needs.budget ? [{ label: "不限預算", patch: { budget: "" } }] : []),
    ...(needs.airport ? [{ label: "不限出發地", patch: { airport: "" } }] : []),
    ...(custom ? [{ label: "也看看現成的跟團行程", patch: { service: "undecided" as const } }] : []),
  ];
  const withCount = (options: Omit<RelaxOption, "count">[]) => options.map(option => ({ ...option, count: matchedTrips(trips, { ...needs, ...option.patch }, today).length })).filter(option => option.count > 0);
  const found = withCount(single);
  if (found.length || single.length < 2) return found;
  // 單獨放寬任何一項都不夠時，才提供一次清掉。
  return withCount([{ label: custom ? "不限條件，看看現成的跟團行程" : "清除全部條件", patch: { destination: "", start: "", end: "", budget: "", airport: "", ...(custom ? { service: "undecided" as const } : {}) } }]);
}

export function needsSummary(needs: TravelNeeds, selected: { candidate: TravelCandidate; departureId: string }[]) {
  return ["來源：官網旅行需求入口 /find-trip", `服務：${serviceLabels[needs.service]}`, `目的地／航點：${needs.destination || "尚未決定"}`, `出發日範圍：${needs.start || "不限"} ～ ${needs.end || "不限"}`, `每人預算上限：${needs.budget ? `NT$${needs.budget}` : "尚未決定"}`, `出發機場：${needs.airport || "尚未決定"}`, `同行人數：${needs.people || "尚未決定"}`, ...(needs.service === "partial" ? [`回程日期：${needs.returnDate || "尚未決定"}`, `行李需求：${needs.luggage || "尚未決定"}`] : []), ...(needs.service === "custom" ? [`住宿／交通需求：${needs.stayTransport || "尚未決定"}`] : []), `原始補充需求：${needs.details || "未提供"}`, "候選方案（非訂位／報價承諾）：", ...selected.map(({ candidate: c, departureId }) => {
    const d = c.departures.find(item => item.id === departureId);
    const price = d?.price || c.plan.price || c.trip.price;
    const basis = basisLabels[priceBasis(c.plan, price)];
    return `${c.trip.title}｜${tripPlanLabel(c.plan)} [${c.key}]\n出發日：${d?.date || (c.departures.length ? "待選擇" : "團期尚未公布，請顧問提供")}\n團期備註：${d?.note || "未提供"}\n參考價格：${price || "價格洽詢"}${basis ? `（${basis}）` : ""}`;
  }), ...(selected.length ? [] : ["尚未選擇方案，請顧問依原始條件協助。"]), "人數、住宿、行李及其他文字需求尚未自動配對，須人工確認。"].join("\n");
}
