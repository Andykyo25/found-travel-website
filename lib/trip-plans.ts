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

export function tripPlanSummary(plan: TripPlan) {
  const summary = plan.summary.trim();
  // 舊版編輯器把填寫提示存成預設值；旅客頁面不應把提示當成行程內容。
  return summary === "請簡短說明航班時間或行程內容的主要差異。" ? "" : summary;
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
