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

/** 這個版本是否涵蓋了行程裡的每一個出發日期。 */
export function planCoversAllDepartures(plan: TripPlan, departures: TripDeparture[]) {
  return departures.every((departure) => planAppliesToDeparture(plan, departure.id));
}

/**
 * 只有一個版本的行程不需要「指定哪些團期適用」。新增團期前這個版本若涵蓋全部團期，
 * 新增後就維持「適用所有團期」，這樣之後新增的日期不會變成沒有版本可套用。
 * 新增前就沒涵蓋全部（例如刪掉另一個版本後留下的日期）時不動，改由後台明確提示。
 */
export function keepSinglePlanCoveringAll(before: Trip, after: Trip): Trip {
  if (after.plans.length !== 1 || before.plans.length !== 1) return after;
  if (!planCoversAllDepartures(before.plans[0], before.departures)) return after;
  return {
    ...after,
    plans: [{ ...after.plans[0], departureMode: "all", departureIds: [] }],
  };
}
