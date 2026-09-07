"use client";
import { useState } from "react";
import { formatDepartureDate, formatPrice } from "@/lib/trip-values";
import Link from "next/link";
import {
  groupDeparturesByMonth,
  type DepartureMonthOption,
  type DepartureRow,
} from "@/lib/trip-filters";

export function DepartureBoard({
  rows,
  months,
  activeMonth,
  totalCount,
}: {
  rows: DepartureRow[];
  months: DepartureMonthOption[];
  activeMonth: string;
  totalCount: number;
}) {
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const categories = [...new Set(rows.map((row) => row.region))];
  const filtered = rows.filter((row) => !category || row.region === category);
  const pageCount = Math.max(1, Math.ceil(filtered.length / 24));
  const activePage = Math.min(page, pageCount);
  const groups = groupDeparturesByMonth(
    filtered.slice((activePage - 1) * 24, activePage * 24),
  );
  const tripCount = new Set(filtered.map((row) => row.tripId)).size;
  const activeLabel = months.find((option) => option.id === activeMonth)?.label;

  return (
    <>
      <label className="board-filter">
        目的地{" "}
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="">全部目的地</option>
          {categories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <nav className="month-pills" aria-label="依出發月份篩選">
        <Link
          className={`month-pill${activeMonth ? "" : " active"}`}
          href="/dates"
        >
          全部
          <small>{totalCount}</small>
        </Link>
        {months.map((option) => (
          <Link
            key={option.id}
            className={`month-pill${
              activeMonth === option.id ? " active" : ""
            }`}
            href={`/dates/month/${option.id}`}
          >
            {option.shortLabel}
            <small>{option.count}</small>
          </Link>
        ))}
      </nav>

      <p className="board-summary">
        {activeLabel ? `${activeLabel}共 ` : "共 "}
        <strong>{filtered.length}</strong> 個團期 ・ {tripCount} 條行程
      </p>

      {groups.map((group) => (
        <section className="board-group" key={group.id || "unknown"}>
          <h2 className="board-group-title">
            {group.label}
            <small>本頁 {group.rows.length} 個團期</small>
          </h2>

          <div className="board-rows">
            {group.rows.map((row) => (
              <article
                className="board-row"
                key={`${row.tripId}-${row.departureId}`}
              >
                <div className="board-date">
                  {formatDepartureDate(row.date)}
                </div>

                <div className="board-trip">
                  <h3>
                    <Link href={`/dates/${row.tripId}`}>{row.tripTitle}</Link>
                  </h3>
                  <p>
                    <span>{row.region}</span>
                    <span>{row.days}</span>
                    <span className="board-badge">{row.badge}</span>
                  </p>
                  {row.details ? <p>{row.details}</p> : null}
                </div>

                <div className="board-price">
                  {row.price ? (
                    <strong>{formatPrice(row.price)}</strong>
                  ) : (
                    <span className="board-price-ask">價格洽詢</span>
                  )}
                </div>

                <div className="board-actions">
                  <Link
                    className="board-link primary"
                    href={`/contact?trip=${encodeURIComponent(row.tripId)}&departure=${encodeURIComponent(row.departureId)}`}
                  >
                    詢問此團期
                  </Link>
                  {row.documentUrl ? (
                    <a
                      className="board-link"
                      href={row.documentUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`查看${row.tripTitle}行程內容`}
                    >
                      行程內容
                    </a>
                  ) : row.planCount > 1 ? (
                    <Link
                      className="board-link"
                      href={`/dates/${row.tripId}#plans`}
                      aria-label={`比較${row.tripTitle}的${row.planCount}個行程方案`}
                    >
                      {row.planCount} 個方案
                    </Link>
                  ) : null}
                  <Link
                    className="board-link"
                    href={`/dates/${row.tripId}`}
                    aria-label={`查看${row.tripTitle}全部團期`}
                  >
                    全部團期
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
      {pageCount > 1 ? (
        <nav className="board-pagination" aria-label="團期分頁">
          <button
            className="button button-secondary button-small"
            disabled={activePage === 1}
            onClick={() => setPage(activePage - 1)}
          >
            上一頁
          </button>
          <span role="status">
            第 {activePage} / {pageCount} 頁
          </span>
          <button
            className="button button-secondary button-small"
            disabled={activePage === pageCount}
            onClick={() => setPage(activePage + 1)}
          >
            下一頁
          </button>
        </nav>
      ) : null}
    </>
  );
}

export function DepartureBoardCta({ lineUrl }: { lineUrl: string }) {
  return (
    <section className="board-cta">
      <div>
        <h2>找到想去的團期了嗎？</h2>
        <p>名額與最新價格以顧問回覆為準，留下需求我們會主動與你聯繫。</p>
      </div>
      <div className="board-cta-actions">
        <a className="button" href={lineUrl} target="_blank" rel="noreferrer">
          LINE 聯絡顧問 <span aria-hidden="true">↗</span>
        </a>
        <Link className="button button-secondary" href="/contact">
          填寫聯絡表單 <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
