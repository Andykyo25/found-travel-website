"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  budgetBuckets,
  tripFilterHref,
  type MonthOption,
  type TripFilters,
} from "@/lib/trip-filters";

function CalendarIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <rect
        x="2.4"
        y="3.8"
        width="13.2"
        height="11.8"
        rx="2.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M2.4 7.4h13.2M6.3 2.4v2.8M11.7 2.4v2.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <rect
        x="2.2"
        y="4.4"
        width="13.6"
        height="10.2"
        rx="2.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M2.2 7.8h9.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="12.6" cy="11" r="1.1" fill="currentColor" />
    </svg>
  );
}

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

  return (
    <form
      className={`trip-filter-bar${tone === "on-image" ? " on-image" : ""}`}
      onSubmit={(event) => {
        event.preventDefault();
        router.push(tripFilterHref({ ...filters, month, budget }, false));
      }}
    >
      <label className="trip-filter-field">
        <CalendarIcon />
        <select
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          aria-label="出發月份"
        >
          <option value="">出發月份</option>
          {months.map((option) => (
            <option value={option.id} key={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <span className="trip-filter-divider" aria-hidden="true" />

      <label className="trip-filter-field">
        <WalletIcon />
        <select
          value={budget}
          onChange={(event) => setBudget(event.target.value)}
          aria-label="預算區間"
        >
          <option value="">預算</option>
          {budgetBuckets.map((option) => (
            <option value={option.id} key={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <button className="trip-filter-submit" type="submit">
        搜尋行程
      </button>
    </form>
  );
}
