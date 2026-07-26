"use client";

import { useMemo, useState } from "react";
import type { TripDeparture } from "@/lib/site-content";

type SortKey = "date" | "price";

function numericValue(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : Number.POSITIVE_INFINITY;
}

export function DepartureTable({
  departures,
}: {
  departures: TripDeparture[];
}) {
  const [sortKey, setSortKey] = useState<SortKey>("date");

  const sorted = useMemo(() => {
    const list = [...departures];
    list.sort((left, right) =>
      sortKey === "date"
        ? numericValue(left.date) - numericValue(right.date)
        : numericValue(left.price) - numericValue(right.price),
    );
    return list;
  }, [departures, sortKey]);

  return (
    <>
      <div className="dates-sort">
        <label htmlFor="dates-sort-select">排序</label>
        <select
          id="dates-sort-select"
          value={sortKey}
          onChange={(event) => setSortKey(event.target.value as SortKey)}
        >
          <option value="date">日期（近到遠）</option>
          <option value="price">價格（低到高）</option>
        </select>
      </div>

      <div className="dates-table-wrap">
        <table className="dates-table">
          <thead>
            <tr>
              <th>出發日期</th>
              <th>價格</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((departure) => (
              <tr key={departure.id}>
                <td className="dates-date">{departure.date}</td>
                <td className="dates-price">{departure.price || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
