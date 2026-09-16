import type { Trip, TripPlan, TripDeparture } from "@/lib/site-content";
import { publishedTripPlans, departuresForPlan, tripPlanLabel } from "@/lib/trip-plans";
import { upcomingDepartures, parseDepartureDate, taipeiTodayTime } from "@/lib/trip-values";

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
export type TravelCandidate = { key: string; trip: Trip; plan: TripPlan; departures: TripDeparture[]; reasons: string[]; pending: string[]; needsConfirmation: boolean };

// A lower bound, range, or conditional price cannot prove a hard budget ceiling.
export function exactTwdPrice(value: string) {
  const match = value.trim().match(/^(?:NT\$|TWD)?\s*(\d{1,3}(?:,\d{3})+|\d+)\s*(?:元)?\s*(?:[／/]人)?$/i);
  const amount = match ? Number(match[1].replaceAll(",", "")) : 0;
  return amount > 0 ? amount : null;
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

export function findTravel(trips: Trip[], needs: TravelNeeds, today = taipeiTodayTime()) {
  const candidates: TravelCandidate[] = [];
  const pendingCandidates: TravelCandidate[] = [];
  const excluded = { service: 0, destination: 0, airport: 0, date: 0, budget: 0 };
  if (validateNeeds(needs)) return { candidates, pendingCandidates, excluded };
  for (const trip of trips) for (const plan of publishedTripPlans(trip)) {
    const service = serviceType(plan);
    const airport = departureAirport(plan);
    const missing: string[] = [];
    if (needs.service !== "undecided" && service !== needs.service) {
      if (service !== "unknown" || needs.service !== "group") { excluded.service++; continue; }
      // Legacy catalogue plans remain browseable without a service tag.
    }
    if (needs.destination && trip.region !== needs.destination) { excluded.destination++; continue; }
    if (needs.airport && airport !== needs.airport) {
      if (airport) { excluded.airport++; continue; }
      missing.push(`能否從${needs.airport}出發待確認`);
    }
    const start = parseDepartureDate(needs.start)?.time;
    const end = parseDepartureDate(needs.end)?.time;
    const departures = upcomingDepartures(departuresForPlan(trip.departures, plan), today).filter(d => {
      const time = parseDepartureDate(d.date)!.time;
      return (start === undefined || time >= start) && (end === undefined || time <= end);
    });
    if (!departures.length) { excluded.date++; continue; }
    const confirmed: TripDeparture[] = [];
    const unsure: TripDeparture[] = [];
    for (const d of departures) {
      if (!needs.budget) { confirmed.push(d); continue; }
      const price = d.price || plan.price || trip.price;
      const basis = priceBasis(plan, price);
      const amount = exactTwdPrice(price);
      if (basis === "person" && amount !== null) {
        if (amount <= Number(needs.budget)) confirmed.push(d);
        continue;
      }
      // A clearly stated per-person starting price above the ceiling is still
      // out of budget; a lower starting price does not prove the final price.
      const starting = price.includes("起") ? exactTwdPrice(price.replace("起", "")) : null;
      if (basis === "person" && starting !== null && starting > Number(needs.budget)) continue;
      unsure.push(d);
    }
    if (!confirmed.length && !unsure.length) { excluded.budget++; continue; }
    // Prefer only known-compatible dates. Unknown prices are offered separately
    // when there are no confirmed dates; never mix them into a matched result.
    const usable = confirmed.length ? confirmed : unsure;
    if (needs.budget && !confirmed.length) missing.push("每人價格能否符合預算待確認");
    const reasons = ["有已公布的未來團期", ...(needs.service !== "undecided" && service === needs.service ? [serviceLabels[needs.service]] : []), ...(needs.destination ? [`目的地：${needs.destination}`] : []), ...(needs.airport && airport === needs.airport ? [`出發機場：${airport}`] : []), ...(needs.start || needs.end ? ["出發日在指定範圍內"] : []), ...(needs.budget && confirmed.length ? ["已列價格在每人預算內"] : [])];
    const pending = [...missing, "團位、最終報價與特殊需求須由顧問確認", ...(!airport && !needs.airport ? ["出發機場待確認"] : []), ...(!plan.accommodation ? ["住宿待確認"] : [])];
    const candidate = { key: `${trip.id}/${plan.id}`, trip, plan, departures: usable, reasons, pending, needsConfirmation: missing.length > 0 };
    (missing.length ? pendingCandidates : candidates).push(candidate);
  }
  const compare = (a: TravelCandidate, b: TravelCandidate) => parseDepartureDate(a.departures[0].date)!.time - parseDepartureDate(b.departures[0].date)!.time || a.key.localeCompare(b.key);
  candidates.sort(compare); pendingCandidates.sort(compare);
  return { candidates, pendingCandidates, excluded };
}
export function needsSummary(needs: TravelNeeds, selected: { candidate: TravelCandidate; departureId: string }[]) {
  return ["來源：官網旅行需求入口 /find-trip", `服務：${serviceLabels[needs.service]}`, `目的地／航點：${needs.destination || "尚未決定"}`, `出發日範圍：${needs.start || "不限"} ～ ${needs.end || "不限"}`, `每人預算上限：${needs.budget ? `NT$${needs.budget}` : "尚未決定"}`, `出發機場：${needs.airport || "尚未決定"}`, `同行人數：${needs.people || "尚未決定"}`, ...(needs.service === "partial" ? [`回程日期：${needs.returnDate || "尚未決定"}`, `行李需求：${needs.luggage || "尚未決定"}`] : []), ...(needs.service === "custom" ? [`住宿／交通需求：${needs.stayTransport || "尚未決定"}`] : []), `原始補充需求：${needs.details || "未提供"}`, "候選方案（非訂位／報價承諾）：", ...selected.map(({ candidate: c, departureId }) => {
    const d = c.departures.find(item => item.id === departureId);
    return `${c.trip.title}｜${tripPlanLabel(c.plan)} [${c.key}]\n出發日：${d?.date || "待選擇"}\n團期備註：${d?.note || "未提供"}\n參考價格：${d?.price || c.plan.price || c.trip.price}（${basisLabels[priceBasis(c.plan, d?.price || c.plan.price || c.trip.price)]}）`;
  }), ...(selected.length ? [] : ["尚未選擇方案，請顧問依原始條件協助。"]), "人數、住宿、行李及其他文字需求尚未自動配對，須人工確認。"].join("\n");
}
