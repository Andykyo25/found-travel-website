"use client";

import { useEffect, useRef, useState } from "react";
import type { Trip } from "@/lib/site-content";

function TripCardInner({ trip }: { trip: Trip }) {
  const hasDocument = Boolean(trip.documentUrl);
  const hasDepartures = trip.departures.length > 0;

  return (
    <>
      <span
        className="hero-card-bg"
        style={{ backgroundImage: `url("${trip.image}")` }}
        aria-hidden="true"
      />
      <span className="hero-card-shade" aria-hidden="true" />
      <span className="hero-card-label">{trip.title}</span>
      <span className="hero-card-full">
        <span className="hero-card-badge">{trip.badge}</span>
        <span className="hero-card-info">
          <span className="hero-card-meta">
            <span>{trip.region}</span>
            <span>{trip.days}</span>
          </span>
          <span className="hero-card-title">{trip.title}</span>
          <span className="hero-card-ctas">
            {hasDocument ? (
              <a
                className="hero-card-cta"
                href={trip.documentUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`查看${trip.title}行程內容`}
              >
                查看行程內容 <span aria-hidden="true">↗</span>
              </a>
            ) : null}
            {hasDepartures ? (
              <a
                className="hero-card-cta hero-card-cta-alt"
                href={`/dates/${trip.id}`}
                aria-label={`查看${trip.title}出發時間`}
              >
                查看出發時間 <span aria-hidden="true">→</span>
              </a>
            ) : null}
            {!hasDocument && !hasDepartures ? (
              <span className="hero-card-cta hero-card-cta-disabled">
                行程資料準備中
              </span>
            ) : null}
          </span>
        </span>
      </span>
    </>
  );
}

export function HeroShowcase({ trips }: { trips: Trip[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const onWheel = (event: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      const atStart = el.scrollLeft <= 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
      if ((delta < 0 && atStart) || (delta > 0 && atEnd)) return;
      event.preventDefault();
      el.scrollLeft += delta;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  if (trips.length === 0) return null;

  return (
    <div className="hero-showcase" aria-label="精選旅程" ref={scrollerRef}>
      {trips.map((trip, index) => (
        <div
          key={trip.id}
          className={`hero-card${index === activeIndex ? " active" : ""}`}
          onMouseEnter={() => setActiveIndex(index)}
          onClick={() => setActiveIndex(index)}
          onFocus={() => setActiveIndex(index)}
        >
          <TripCardInner trip={trip} />
        </div>
      ))}
    </div>
  );
}
