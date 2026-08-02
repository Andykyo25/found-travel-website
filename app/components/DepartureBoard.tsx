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
  const groups = groupDeparturesByMonth(rows);
  const tripCount = new Set(rows.map((row) => row.tripId)).size;
  const activeLabel = months.find((option) => option.id === activeMonth)?.label;

  return (
    <>
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
        <strong>{rows.length}</strong> 個團期 ・ {tripCount} 條行程
      </p>

      {groups.map((group) => (
        <section className="board-group" key={group.id || "unknown"}>
          <h2 className="board-group-title">
            {group.label}
            <small>{group.rows.length} 個團期</small>
          </h2>

          <div className="board-rows">
            {group.rows.map((row) => (
              <article
                className="board-row"
                key={`${row.tripId}-${row.departureId}`}
              >
                <div className="board-date">{row.date}</div>

                <div className="board-trip">
                  <h3>
                    <Link href={`/dates/${row.tripId}`}>{row.tripTitle}</Link>
                  </h3>
                  <p>
                    <span>{row.region}</span>
                    <span>{row.days}</span>
                    <span className="board-badge">{row.badge}</span>
                  </p>
                </div>

                <div className="board-price">
                  {row.price ? (
                    <strong>{row.price}</strong>
                  ) : (
                    <span className="board-price-ask">價格洽詢</span>
                  )}
                </div>

                <div className="board-actions">
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
                  ) : null}
                  <Link
                    className="board-link primary"
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
