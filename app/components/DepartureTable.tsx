"use client";

import Link from "next/link";
import {
  parseDepartureDate,
  priceValue,
  formatDepartureDate,
  formatPrice,
} from "@/lib/trip-values";
import { useMemo, useState } from "react";
import type { TripDeparture, TripPlan } from "@/lib/site-content";
import { plansForDeparture, tripPlanLabel } from "@/lib/trip-plans";

type SortKey = "date" | "price";

export function DepartureTable({
  departures,
  plans,
  tripId,
}: {
  departures: TripDeparture[];
  plans: TripPlan[];
  tripId: string;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("date");

  const sorted = useMemo(() => {
    const list = [...departures];
    list.sort((left, right) =>
      sortKey === "date"
        ? (parseDepartureDate(left.date)?.time ?? Infinity) -
          (parseDepartureDate(right.date)?.time ?? Infinity)
        : (priceValue(left.price) ?? Infinity) -
          (priceValue(right.price) ?? Infinity),
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
              <th>諮詢</th>
              <th className="dates-price-heading">價格</th>
              {plans.length > 0 ? <th>適用方案</th> : null}
            </tr>
          </thead>
          <tbody>
            {sorted.map((departure) => (
              <tr key={departure.id}>
                <td className="dates-date">
                  {formatDepartureDate(departure.date)}
                  {departure.note ? (
                    <small className="departure-note">{departure.note}</small>
                  ) : null}
                </td>
                <td>
                  <Link
                    className="board-link"
                    href={`/contact?trip=${encodeURIComponent(tripId)}&departure=${encodeURIComponent(departure.id)}`}
                  >
                    詢問此團期
                  </Link>
                </td>
                <td className="dates-price">{formatPrice(departure.price)}</td>
                {plans.length > 0 ? (
                  <td>
                    {plansForDeparture(plans, departure.id).length > 0 ? (
                      <span className="dates-plan-list">
                        {plansForDeparture(plans, departure.id).map((plan) => (
                          <a href={`#plan-${plan.id}`} key={plan.id}>
                            {tripPlanLabel(plan)}
                          </a>
                        ))}
                      </span>
                    ) : (
                      <span className="dates-plan-empty">方案請洽詢</span>
                    )}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
