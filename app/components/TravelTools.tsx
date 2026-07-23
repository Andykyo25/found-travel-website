"use client";

import { useEffect, useMemo, useState } from "react";
import type { Destination } from "@/lib/site-content";

type TravelData = {
  temperature: number;
  weatherLabel: string;
  rate: number;
  updatedAt: string;
};

export function TravelTools({ destination }: { destination: Destination }) {
  const [now, setNow] = useState(() => new Date());
  const [data, setData] = useState<TravelData | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      latitude: String(destination.latitude),
      longitude: String(destination.longitude),
      currency: destination.currency,
    });

    fetch(`/api/travel-tools?${params}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("travel data unavailable");
        return response.json() as Promise<TravelData>;
      })
      .then(setData)
      .catch(() => undefined);

    return () => controller.abort();
  }, [
    destination.currency,
    destination.latitude,
    destination.longitude,
  ]);

  const localTime = useMemo(
    () =>
      new Intl.DateTimeFormat("zh-TW", {
        timeZone: destination.timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(now),
    [destination.timezone, now],
  );

  return (
    <section className="travel-tools" aria-label={`${destination.city}即時資訊`}>
      <div className="tool">
        <span className="tool-icon" aria-hidden="true">
          ◷
        </span>
        <div>
          <small>{destination.city}・當地時間</small>
          <strong>{localTime}</strong>
        </div>
      </div>
      <div className="tool">
        <span className="tool-icon" aria-hidden="true">
          ☀
        </span>
        <div aria-live="polite">
          <small>{destination.city}・現在天氣</small>
          <strong>
            {data
              ? `${Math.round(data.temperature)}°C　${data.weatherLabel}`
              : "正在取得…"}
          </strong>
        </div>
      </div>
      <div className="tool">
        <span className="tool-icon" aria-hidden="true">
          ¥
        </span>
        <div aria-live="polite">
          <small>當地貨幣匯率</small>
          <strong>
            1 TWD = {data ? data.rate.toFixed(2) : "—"} {destination.currency}
          </strong>
          <span className="tool-note">・即時參考值</span>
        </div>
      </div>
    </section>
  );
}
