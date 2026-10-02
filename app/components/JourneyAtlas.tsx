"use client";

import { useState } from "react";
import Link from "next/link";
import { TravelImage } from "./TravelImage";

type Journey = { id: string; title: string; region: string; badge: string; summary: string; image: string };

export function JourneyAtlas({ journeys }: { journeys: Journey[] }) {
  // previous 讓新照片由下往上「擦」進來，舊照片留在底下直到動畫結束。
  const [state, setState] = useState({ id: journeys[0]?.id, previous: "" });
  const journey = journeys.find((item) => item.id === state.id) ?? journeys[0];
  if (!journey) return null;
  const index = journeys.indexOf(journey);

  return (
    <div className="fh-atlas" data-rv>
      <div className="fh-atlas-head">
        <span>THE INSPIRATION INDEX</span>
        <span>旅行靈感選集</span>
      </div>
      <div className="fh-atlas-tabs" role="group" aria-label="選擇旅行靈感">
        {journeys.map((item, i) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={journey.id === item.id}
            aria-controls="atlas-journey"
            onClick={() => setState((current) => (current.id === item.id ? current : { id: item.id, previous: current.id ?? "" }))}
          >
            <span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
            {item.badge || item.title}
          </button>
        ))}
      </div>
      <Link id="atlas-journey" className="fh-atlas-card" href={`/dates/${journey.id}`} aria-label={`探索${journey.title}`} data-cursor="探索">
        <div className="fh-atlas-photo">
          {journeys.map((item) => (
            <div
              key={item.id}
              className={`fh-atlas-img${item.id === journey.id ? " is-on" : ""}${item.id === state.previous ? " is-prev" : ""}`}
              aria-hidden={item.id === journey.id ? undefined : true}
            >
              <TravelImage
                src={item.image}
                alt={item.id === journey.id ? `${item.title}旅行風景` : ""}
                sizes="(max-width: 760px) 90vw, 44vw"
              />
            </div>
          ))}
          <span className="fh-marks" aria-hidden="true"><b /><b /><b /><b /></span>
          <span className="fh-atlas-label">{journey.region}</span>
          <span className="fh-atlas-arrow" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M8 7h9v9" /></svg>
          </span>
        </div>
        <div className="fh-atlas-caption" aria-live="polite" aria-atomic="true" key={journey.id}>
          <div>
            <span className="fh-atlas-count" aria-hidden="true">
              {String(index + 1).padStart(2, "0")} / {String(journeys.length).padStart(2, "0")}
            </span>
            <h3>{journey.title}</h3>
          </div>
          <p>{journey.summary}</p>
        </div>
      </Link>
    </div>
  );
}
