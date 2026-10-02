import type { CSSProperties } from "react";
import { TravelImage } from "./TravelImage";
import { upcomingDepartures, formatPrice } from "@/lib/trip-values";
import Link from "next/link";
import type { Trip } from "@/lib/site-content";
import { nextDepartureLabel } from "@/lib/trip-filters";
import { publishedTripPlans } from "@/lib/trip-plans";

function PinIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M8 1.6c-2.4 0-4.3 1.9-4.3 4.3 0 3.1 4.3 8.5 4.3 8.5s4.3-5.4 4.3-8.5c0-2.4-1.9-4.3-4.3-4.3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <circle cx="8" cy="5.9" r="1.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M2.5 5h9l-2-2m4 6h-9l2 2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <rect x="2.2" y="3.4" width="11.6" height="10.4" rx="2" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.2 6.6h11.6M5.6 2.2v2.4M10.4 2.2v2.4" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function PackageCard({
  trip,
  index = 0,
  priority = false,
}: {
  trip: Trip;
  index?: number;
  priority?: boolean;
}) {
  const departures = upcomingDepartures(trip.departures);
  const plans = publishedTripPlans(trip);

  return (
    <article className="fh-card" data-rv style={{ "--rv-i": index % 3 } as CSSProperties} data-cursor="看行程">
      <Link className="fh-card-media" href={`/dates/${trip.id}`} aria-label={`探索${trip.title}`} tabIndex={-1} aria-hidden="true">
        <span className="fh-card-img">
          <TravelImage src={trip.image} alt={`${trip.title}行程風景`} priority={priority} sizes="(max-width: 760px) 86vw, (max-width: 1100px) 46vw, 30vw" />
        </span>
        <span className="fh-marks" aria-hidden="true"><b /><b /><b /><b /></span>
        <span className="fh-card-badge">{trip.badge}</span>
        <span className="fh-card-no" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
      </Link>

      <div className="fh-card-body">
      <h3>
        <Link href={`/dates/${trip.id}`}>{trip.title}</Link>
      </h3>
      <p className="fh-card-summary">{trip.summary}</p>

      <ul className="fh-card-meta">
        <li>
          <PinIcon />
          {trip.region}
        </li>
        <li>
          <RouteIcon />
          {trip.days}
        </li>
        <li>
          <CalendarIcon />
          {nextDepartureLabel(trip)}
        </li>
      </ul>

      {departures.length > 0 ? (
        <Link className="fh-card-dates" href={`/dates/${trip.id}`} aria-label={`查看${trip.title}出發時間`}>
          查看全部 {departures.length} 個出發日 <span aria-hidden="true">→</span>
        </Link>
      ) : null}

      {/* footer 一定是卡片最後一個元素，配合 margin-top:auto
          讓同一列每張卡的價格與按鈕都對齊在底部。 */}
      <div className="fh-card-foot">
        <div className="fh-card-price">
          <strong>{formatPrice(trip.price, true)}</strong>
          <small>
            {trip.days}行程{plans.length > 1 ? `・${plans.length} 個方案` : ""}
          </small>
        </div>
        <Link className="fh-card-book" href={`/dates/${trip.id}`} aria-label={`查看${trip.title}行程內容`}>
          查看行程
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
        </Link>
      </div>
      </div>
    </article>
  );
}
