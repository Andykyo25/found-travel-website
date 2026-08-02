import Link from "next/link";
import type { Trip } from "@/lib/site-content";
import { nextDepartureLabel } from "@/lib/trip-filters";

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
      <path
        d="M2.5 5h9l-2-2m4 6h-9l2 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M8.4 2H3v5.4l6.6 6.6 5.4-5.4L8.4 2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <circle cx="5.6" cy="4.6" r="0.9" fill="currentColor" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <rect
        x="2.2"
        y="3.4"
        width="11.6"
        height="10.4"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M2.2 6.6h11.6M5.6 2.2v2.4M10.4 2.2v2.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PackageCard({
  trip,
  priority = false,
}: {
  trip: Trip;
  priority?: boolean;
}) {
  return (
    <article className="package-card">
      <div className="package-image">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={trip.image}
          alt={`${trip.title}行程風景`}
          loading={priority ? "eager" : "lazy"}
        />
        <span className="package-badge">{trip.badge}</span>
      </div>

      <h3>{trip.title}</h3>

      <p className="package-location">
        <PinIcon />
        {trip.region}
      </p>

      <div className="package-meta">
        <span>
          <RouteIcon />
          {trip.days}
        </span>
        <span>
          <TagIcon />
          {trip.badge}
        </span>
        <span>
          <CalendarIcon />
          {nextDepartureLabel(trip)}
        </span>
      </div>

      <div className="package-footer">
        <div className="package-price">
          <strong>{trip.price}</strong>
          <small>{trip.days}行程</small>
        </div>
        {trip.documentUrl ? (
          <a
            className="package-book"
            href={trip.documentUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`查看${trip.title}行程內容`}
          >
            查看行程
          </a>
        ) : (
          <Link
            className="package-book"
            href="/contact"
            aria-label={`諮詢${trip.title}`}
          >
            立即諮詢
          </Link>
        )}
      </div>

      {trip.departures.length > 0 ? (
        <Link
          className="package-dates"
          href={`/dates/${trip.id}`}
          aria-label={`查看${trip.title}出發時間`}
        >
          查看全部 {trip.departures.length} 個出發日{" "}
          <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </article>
  );
}
