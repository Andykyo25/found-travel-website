import Link from "next/link";
import { getSiteContent } from "@/lib/site-content";
import {
  departureMonthOptions,
  departureRows,
  groupDeparturesByMonth,
  upcomingDepartureRows,
} from "@/lib/trip-filters";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readMonth(params: Record<string, string | string[] | undefined>) {
  const raw = Array.isArray(params.month) ? params.month[0] : params.month;
  return typeof raw === "string" && /^\d{4}-\d{2}$/.test(raw) ? raw : "";
}

// 帶月份時給不同的 title，讓「奧捷 2026年11月 出發」這類長尾查詢有東西可對。
export async function generateMetadata({ searchParams }: PageProps) {
  const month = readMonth(await searchParams);
  if (!month) {
    return {
      title: "出發團期總表",
      description:
        "找到了旅行社所有行程的出發日期與價格一次看，可依月份篩選，並直接查看完整行程內容。",
    };
  }

  const [year, monthNumber] = month.split("-");
  const label = `${year} 年 ${Number(monthNumber)} 月`;
  return {
    title: `${label}出發團期`,
    description: `找到了旅行社 ${label} 的所有出發日期與團費，一次看完可報名的團期。`,
  };
}

export default async function AllDeparturesPage({ searchParams }: PageProps) {
  const month = readMonth(await searchParams);
  const content = await getSiteContent();

  const allRows = upcomingDepartureRows(departureRows(content.trips));
  const months = departureMonthOptions(allRows);
  const rows = month ? allRows.filter((row) => row.monthId === month) : allRows;
  const groups = groupDeparturesByMonth(rows);
  const tripCount = new Set(rows.map((row) => row.tripId)).size;

  return (
    <main className="board-shell">
      <header className="dates-header">
        <Link className="brand" href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-logo" src="/brand/logo-mark.png" alt="" />
          <span>{content.brandName}</span>
        </Link>
        <Link className="button button-secondary button-small" href="/#journeys">
          回行程列表
        </Link>
      </header>

      <section className="board-head">
        <p className="eyebrow">
          <span />
          DEPARTURE BOARD
        </p>
        <h1>出發團期總表</h1>
        <p className="board-lede">
          所有行程的出發日期與團費集中在這一頁，依日期由近到遠排列。
          已出發的團期不再顯示，想確認名額請直接與顧問聯繫。
        </p>
      </section>

      {allRows.length === 0 ? (
        <div className="board-empty">
          <p>目前尚未公布出發團期，歡迎透過 LINE 詢問最新團期。</p>
          <a
            className="button"
            href={content.lineUrl}
            target="_blank"
            rel="noreferrer"
          >
            LINE 詢問團期 <span aria-hidden="true">↗</span>
          </a>
        </div>
      ) : (
        <>
          <nav className="month-pills" aria-label="依出發月份篩選">
            <Link
              className={`month-pill${month ? "" : " active"}`}
              href="/dates"
            >
              全部
              <small>{allRows.length}</small>
            </Link>
            {months.map((option) => (
              <Link
                key={option.id}
                className={`month-pill${
                  month === option.id ? " active" : ""
                }`}
                href={`/dates?month=${option.id}`}
              >
                {option.shortLabel}
                <small>{option.count}</small>
              </Link>
            ))}
          </nav>

          <p className="board-summary">
            {month
              ? `${months.find((option) => option.id === month)?.label ?? ""}共 `
              : "共 "}
            <strong>{rows.length}</strong> 個團期 ・ {tripCount} 條行程
          </p>

          {rows.length === 0 ? (
            <div className="board-empty">
              <p>這個月份目前沒有團期。</p>
              <Link className="button button-secondary" href="/dates">
                查看全部月份
              </Link>
            </div>
          ) : (
            groups.map((group) => (
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
                          <Link href={`/dates/${row.tripId}`}>
                            {row.tripTitle}
                          </Link>
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
            ))
          )}
        </>
      )}

      <section className="board-cta">
        <div>
          <h2>找到想去的團期了嗎？</h2>
          <p>名額與最新價格以顧問回覆為準，留下需求我們會主動與你聯繫。</p>
        </div>
        <div className="board-cta-actions">
          <a
            className="button"
            href={content.lineUrl}
            target="_blank"
            rel="noreferrer"
          >
            LINE 聯絡顧問 <span aria-hidden="true">↗</span>
          </a>
          <Link className="button button-secondary" href="/contact">
            填寫聯絡表單 <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
