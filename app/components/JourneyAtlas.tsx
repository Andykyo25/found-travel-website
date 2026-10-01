"use client";

import { useState } from "react";
import Link from "next/link";
import { TravelImage } from "./TravelImage";

type Journey = { id: string; title: string; region: string; badge: string; summary: string; image: string };

export function JourneyAtlas({ journeys }: { journeys: Journey[] }) {
  const [selectedId, setSelectedId] = useState(journeys[0]?.id);
  const journey = journeys.find(item => item.id === selectedId) ?? journeys[0];
  if (!journey) return null;
  const index = journeys.indexOf(journey);

  return <div className="journey-atlas">
    <div className="atlas-heading"><span>THE INSPIRATION INDEX</span><span>旅行靈感選集</span></div>
    <div className="atlas-choices" role="group" aria-label="選擇旅行靈感">
      {journeys.map((item, i) => <button type="button" key={item.id} aria-pressed={journey.id === item.id}
        aria-controls="atlas-journey" onClick={() => setSelectedId(item.id)}>
        <span aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>{item.badge || item.title}
      </button>)}
    </div>
    <Link id="atlas-journey" className="atlas-postcard" href={`/dates/${journey.id}`} aria-label={`探索${journey.title}`}>
      <div className="atlas-photo" key={journey.id}>
        <TravelImage src={journey.image} alt={`${journey.title}旅行風景`} sizes="(max-width: 760px) 90vw, 42vw" />
        <span className="atlas-photo-label">{journey.region}</span>
        <span className="atlas-photo-arrow" aria-hidden="true">↗</span>
      </div>
      <div className="atlas-caption" aria-live="polite" aria-atomic="true">
        <div><span className="atlas-count" aria-hidden="true">{String(index + 1).padStart(2, "0")} / {String(journeys.length).padStart(2, "0")}</span><h3>{journey.title}</h3></div>
        <p>{journey.summary}</p>
      </div>
    </Link>
  </div>;
}
