"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  budgetBuckets,
  tripFilterHref,
  type MonthOption,
  type TripFilters,
} from "@/lib/trip-filters";

export function TripFilterBar({
  months,
  filters,
  tone = "light",
}: {
  months: MonthOption[];
  filters: TripFilters;
  tone?: "light" | "on-image";
}) {
  const router = useRouter();
  const [month, setMonth] = useState(filters.month);
  const [budget, setBudget] = useState(filters.budget);

  const search = () => {
    router.push(tripFilterHref({ ...filters, month, budget }, false));
  };

  return (
    <form
      className={`trip-filter-bar${tone === "on-image" ? " on-image" : ""}`}
      onSubmit={(event) => {
        event.preventDefault();
        search();
      }}
    >
      <label className="trip-filter-field">
        <span className="trip-filter-icon" aria-hidden="true">
          ▤
        </span>
        <span className="trip-filter-text">
          <small>出發月份</small>
          <select
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            aria-label="出發月份"
          >
            <option value="">不限月份</option>
            {months.map((option) => (
              <option value={option.id} key={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </span>
      </label>

      <span className="trip-filter-divider" aria-hidden="true" />

      <label className="trip-filter-field">
        <span className="trip-filter-icon" aria-hidden="true">
          ◈
        </span>
        <span className="trip-filter-text">
          <small>預算</small>
          <select
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
            aria-label="預算區間"
          >
            <option value="">不限預算</option>
            {budgetBuckets.map((option) => (
              <option value={option.id} key={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </span>
      </label>

      <button className="trip-filter-submit" type="submit">
        搜尋行程
      </button>
    </form>
  );
}
