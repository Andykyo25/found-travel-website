"use client";

import { useMemo, useState } from "react";
import type { TripDeparture, TripPlan } from "@/lib/site-content";
import { plansForDeparture, tripPlanLabel } from "@/lib/trip-plans";

type SortKey = "date" | "price";

function numericValue(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : Number.POSITIVE_INFINITY;
}

export function DepartureTable({
  departures,
  plans,
}: {
  departures: TripDeparture[];
  plans: TripPlan[];
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
              <th className="dates-price-heading">價格</th>
              {plans.length > 0 ? <th>適用方案</th> : null}
            </tr>
          </thead>
          <tbody>
            {sorted.map((departure) => (
              <tr key={departure.id}>
                <td className="dates-date">{departure.date}</td>
                <td className="dates-price">{departure.price || "—"}</td>
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
