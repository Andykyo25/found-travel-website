import Link from "next/link";
import { formatDepartureDate, formatPrice } from "@/lib/trip-values";
import type { TripDeparture, TripPlan } from "@/lib/site-content";
import { departuresForPlan, tripPlanLabel } from "@/lib/trip-plans";

export function TripPlanCard({
  plan,
  departures,
  fallbackPrice,
  index,
  tripId,
}: {
  plan: TripPlan;
  departures: TripDeparture[];
  fallbackPrice: string;
  index: number;
  tripId: string;
}) {
  const applicableDepartures = departuresForPlan(departures, plan);
  const visibleDepartures = applicableDepartures.slice(0, 3);
  const remainingCount = applicableDepartures.length - visibleDepartures.length;

  return (
    <article className="trip-plan-card" id={`plan-${plan.id}`}>
      <div className="trip-plan-heading">
        <span className="trip-plan-number">方案 {index + 1}</span>
        <span className="trip-plan-airline">{plan.airline}</span>
      </div>

      <h3>{plan.title}</h3>
      {plan.summary ? (
        <p className="trip-plan-summary">{plan.summary}</p>
      ) : null}

      <div className="trip-plan-departures">
        <strong>適用團期</strong>
        {applicableDepartures.length > 0 ? (
          <div className="trip-plan-date-list">
            {visibleDepartures.map((departure) => (
              <span key={departure.id}>
                {formatDepartureDate(departure.date)}
              </span>
            ))}
            {remainingCount > 0 ? (
              <span>另有 {remainingCount} 個團期</span>
            ) : null}
          </div>
        ) : (
          <span className="trip-plan-date-empty">團期請洽詢</span>
        )}
      </div>

      <Link
        className="button button-small"
        href={`/contact?trip=${encodeURIComponent(tripId)}&plan=${encodeURIComponent(plan.id)}`}
      >
        諮詢此方案
      </Link>
      <div className="trip-plan-footer">
        <div className="trip-plan-price">
          <small>方案參考價</small>
          <strong>{formatPrice(plan.price || fallbackPrice, true)}</strong>
        </div>
        <a
          className="button button-small"
          href={plan.documentUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`開啟${tripPlanLabel(plan)}完整行程`}
        >
          {plan.documentType === "pdf" ? "開啟行程 PDF" : "開啟 Drive 行程"}
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </article>
  );
}
