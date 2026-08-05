"use client";

import { useEffect, useMemo, useState } from "react";
import type { Destination } from "@/lib/site-content";
import {
  resolveInitialDestinationId,
  travelDestinations,
} from "@/lib/travel-destinations";

type TravelData = {
  temperature: number;
  weatherLabel: string;
  rate: number;
  updatedAt: string;
  sources: {
    weather: string;
    exchange: string;
  };
};

type TravelDataState =
  | {
      requestKey: string;
      status: "loading" | "unavailable";
      data: null;
    }
  | {
      requestKey: string;
      status: "ready";
      data: TravelData;
    };

export function TravelTools({ destination }: { destination: Destination }) {
  const [selectedId, setSelectedId] = useState(() =>
    resolveInitialDestinationId(destination),
  );
  const selected =
    travelDestinations.find((option) => option.id === selectedId) ??
    travelDestinations[0];
  const requestKey = `${selected.latitude}:${selected.longitude}:${selected.currency}`;

  const [now, setNow] = useState(() => new Date());
  const [dataState, setDataState] = useState<TravelDataState>({
    requestKey,
    status: "loading",
    data: null,
  });
  const activeDataState: TravelDataState =
    dataState.requestKey === requestKey
      ? dataState
      : { requestKey, status: "loading", data: null };
  const { data, status: dataStatus } = activeDataState;

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      latitude: String(selected.latitude),
      longitude: String(selected.longitude),
      currency: selected.currency,
    });

    fetch(`/api/travel-tools?${params}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("travel data unavailable");
        return response.json() as Promise<TravelData>;
      })
      .then((result) => {
        setDataState({ requestKey, status: "ready", data: result });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setDataState({ requestKey, status: "unavailable", data: null });
      });

    return () => controller.abort();
  }, [requestKey, selected.currency, selected.latitude, selected.longitude]);

  const localTime = useMemo(
    () =>
      new Intl.DateTimeFormat("zh-TW", {
        timeZone: selected.timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(now),
    [selected.timezone, now],
  );

  const fetchedAt = data
    ? new Intl.DateTimeFormat("zh-TW", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(data.updatedAt))
    : "";

  return (
    <section className="travel-tools-panel" aria-label="旅遊目的地即時資訊">
      <div className="travel-tools-picker">
        <label htmlFor="travel-destination">選擇目的地</label>
        <select
          id="travel-destination"
          value={selected.id}
          onChange={(event) => setSelectedId(event.target.value)}
        >
          {travelDestinations.map((option) => (
            <option value={option.id} key={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="travel-tools">
        <div className="tool">
          <span className="tool-icon" aria-hidden="true">
            ◷
          </span>
          <div>
            <small>{selected.city}・當地時間</small>
            <strong>{localTime}</strong>
          </div>
        </div>
        <div className="tool">
          <span className="tool-icon" aria-hidden="true">
            ☀
          </span>
          <div aria-live="polite">
            <small>{selected.city}・現在天氣</small>
            <strong>
              {data
                ? `${Math.round(data.temperature)}°C　${data.weatherLabel}`
                : dataStatus === "unavailable"
                  ? "暫時無法取得"
                  : "正在取得…"}
            </strong>
            {data ? (
              <span className="tool-note">
                ・{data.sources.weather}　{fetchedAt} 取得
              </span>
            ) : null}
          </div>
        </div>
        <div className="tool">
          <span className="tool-icon" aria-hidden="true">
            ¥
          </span>
          <div aria-live="polite">
            <small>當地貨幣匯率</small>
            <strong>
              {data
                ? `1 TWD = ${data.rate.toFixed(2)} ${selected.currency}`
                : dataStatus === "unavailable"
                  ? "暫時無法取得"
                  : "正在取得…"}
            </strong>
            {data ? (
              <span className="tool-note">
                ・{data.sources.exchange}　{fetchedAt} 取得
              </span>
            ) : null}
          </div>
        </div>
        <div className="tool">
          <span className="tool-icon" aria-hidden="true">
            {"⚡︎"}
          </span>
          <div>
            <small>{selected.city}・電壓插頭</small>
            <strong>
              {selected.voltage}　{selected.plugTypes} 型
            </strong>
            <span className="tool-note">・{selected.frequency}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
