"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDepartureDate, formatPrice } from "@/lib/trip-values";
import type { TripDeparture, TripPlan } from "@/lib/site-content";
import { departuresForPlan, tripPlanLabel } from "@/lib/trip-plans";

export function TripPlanCard({
  plan,
  departures,
  fallbackPrice,
  tripId,
  days,
  openInquiryInNewTab = false,
}: {
  plan: TripPlan;
  departures: TripDeparture[];
  fallbackPrice: string;
  tripId: string;
  days?: string;
  openInquiryInNewTab?: boolean;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const applicableDepartures = departuresForPlan(departures, plan);
  const selectedDeparture = applicableDepartures.find(d => d.id === selectedId);
  const visibleDepartures = showAll ? applicableDepartures : applicableDepartures.slice(0, 6);
  const remainingCount = applicableDepartures.length - visibleDepartures.length;
  const versionLabel = tripPlanLabel(plan);
  const inquiryHref = `/contact?trip=${encodeURIComponent(tripId)}&plan=${encodeURIComponent(plan.id)}${selectedDeparture ? `&departure=${encodeURIComponent(selectedDeparture.id)}` : ""}`;

  return (
    <article className="trip-plan-card" id={`plan-${plan.id}`}>
      <div className="trip-plan-heading">
        <span className="trip-plan-airline">{plan.airline}</span>
      </div>

      <h3>{plan.title}</h3>
      {plan.summary ? (
        <p className="trip-plan-summary">{plan.summary}</p>
      ) : null}

      {(days || plan.flight || plan.accommodation) && <dl className="trip-plan-facts">
        {days && <><dt>行程天數</dt><dd>{days}</dd></>}
        {plan.flight && <><dt>航班時段</dt><dd>{plan.flight}</dd></>}
        {plan.accommodation && <><dt>住宿安排</dt><dd>{plan.accommodation}</dd></>}
      </dl>}

      <div className="trip-plan-departures">
        <strong>選擇出發日期</strong>
        {applicableDepartures.length > 0 ? (
          <div className="trip-plan-date-list">
            {visibleDepartures.map((departure) => (
              <button type="button" key={departure.id}
                aria-pressed={selectedDeparture?.id === departure.id}
                aria-label={`${versionLabel} ${formatDepartureDate(departure.date)}${departure.note ? ` ${departure.note}` : ""}`}
                onClick={() => setSelectedId(id => id === departure.id ? null : departure.id)}>
                {formatDepartureDate(departure.date)}
                {departure.note && <small>{departure.note}</small>}
              </button>
            ))}
            {remainingCount > 0 ? (
              <button type="button" className="trip-plan-more" onClick={() => setShowAll(true)}>展開另外 {remainingCount} 個團期</button>
            ) : null}
            {showAll && applicableDepartures.length > 6 && <button type="button" className="trip-plan-more" onClick={() => { setShowAll(false); if (selectedDeparture && !applicableDepartures.slice(0, 6).some(d => d.id === selectedDeparture.id)) setSelectedId(null); }}>收合日期</button>}
          </div>
        ) : (
          <span className="trip-plan-date-empty">團期請洽詢</span>
        )}
      </div>

      <a
        className="button button-small trip-plan-document"
        href={plan.documentUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={`查看${versionLabel}完整行程${plan.documentType === "pdf" ? " PDF" : "（Drive）"}`}
      >
        查看{plan.airline || plan.title}版行程{plan.documentType === "pdf" ? " PDF" : "（Drive）"}
        <span aria-hidden="true">↗</span>
      </a>
      <div className="trip-plan-footer">
        <div className="trip-plan-price" aria-live="polite">
          <small>{selectedDeparture ? `${formatDepartureDate(selectedDeparture.date)} 出發` : "版本參考起價"}</small>
          <strong>{selectedDeparture ? formatPrice(selectedDeparture.price) : formatPrice(plan.price || fallbackPrice, true)}</strong>
          {selectedDeparture?.note && <small>{selectedDeparture.note}</small>}
        </div>
        <Link
          className="button button-small"
          href={inquiryHref}
          target={openInquiryInNewTab ? "_blank" : undefined}
          rel={openInquiryInNewTab ? "noreferrer" : undefined}
          aria-label={`詢問${versionLabel}${selectedDeparture ? ` ${formatDepartureDate(selectedDeparture.date)} 出發` : ""}`}
        >
          詢問{plan.airline || plan.title}版
        </Link>
      </div>
    </article>
  );
}
