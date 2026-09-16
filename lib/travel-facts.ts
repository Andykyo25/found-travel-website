import type { TripPlan } from "@/lib/site-content";

// Read existing, explicit wording. Never infer an origin from a city mentioned
// in an itinerary, nor turn an amenity/marketing claim into a verified tag.
export function departureAirport(plan: TripPlan) {
  if (plan.departureAirport?.trim()) return plan.departureAirport.trim();
  const text = `${plan.flight || ""}\n${plan.summary || ""}`;
  const fields = [...text.matchAll(/出發機場[：:]([^\n，,；;。]*)/g)];
  if (fields.some(m => new Set(m[1].match(/桃園|松山|台中|臺中|高雄/g)).size > 1)) return "";
  const matches = [...text.matchAll(/(?:出發機場[：:]\s*(桃園|松山|台中|臺中|高雄)|(?:^|[\s，,；;。／/、或])(?:由)?(桃園|松山|台中|臺中|高雄)(?:機場)?出發)/g)];
  const values = [...new Set(matches.map(m => (m[1] || m[2]).replace("臺中", "台中")))];
  return values.length === 1 ? values[0] : "";
}

export function priceBasis(plan: TripPlan, price: string): NonNullable<TripPlan["priceBasis"]> {
  const explicit = [
    /(?:[／/]\s*人|每人)/.test(price) ? "person" : "",
    /(?:[／/]\s*房|每房)/.test(price) ? "room" : "",
    /(?:[／/]\s*團|整團)/.test(price) ? "group" : "",
  ].filter(Boolean);
  if (explicit.length > 1) return "unknown";
  const stored = plan.priceBasis && plan.priceBasis !== "unknown" ? plan.priceBasis : null;
  if (stored && explicit.length && stored !== explicit[0]) return "unknown";
  return stored || (explicit[0] as TripPlan["priceBasis"]) || "unknown";
}

export function serviceType(plan: TripPlan): NonNullable<TripPlan["serviceType"]> {
  if (plan.serviceType && plan.serviceType !== "unknown") return plan.serviceType;
  const text = plan.summary || "";
  const matches = [...text.matchAll(/(?:^|[\n；;])\s*服務類型[：:]\s*(跟團|客製|機票|機加酒|包車)(?=$|[\n；;])/g)];
  const values = [...new Set(matches.map(m => m[1] === "跟團" ? "group" : m[1] === "客製" ? "custom" : "partial"))];
  return values.length === 1 ? values[0] as NonNullable<TripPlan["serviceType"]> : "unknown";
}
