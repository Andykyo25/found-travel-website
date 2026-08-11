// 前台與後台共用的方案判定。此檔案只 import type，避免把伺服器端的
// site-content 儲存邏輯帶進 client component。
import type {
  Trip,
  TripDeparture,
  TripPlan,
} from "@/lib/site-content";

export function tripPlanLabel(plan: TripPlan) {
  return [plan.airline, plan.title].filter(Boolean).join("｜");
}

export function publishedTripPlans(trip: Trip) {
  return trip.plans.filter((plan) => Boolean(plan.documentUrl));
}

export function planAppliesToDeparture(
  plan: TripPlan,
  departureId: string,
) {
  return (
    plan.departureMode === "all" || plan.departureIds.includes(departureId)
  );
}

export function departuresForPlan(
  departures: TripDeparture[],
  plan: TripPlan,
) {
  return plan.departureMode === "all"
    ? departures
    : departures.filter((departure) =>
        plan.departureIds.includes(departure.id),
      );
}

export function plansForDeparture(plans: TripPlan[], departureId: string) {
  return plans.filter(
    (plan) =>
      Boolean(plan.documentUrl) && planAppliesToDeparture(plan, departureId),
  );
}
