import Link from "next/link";
import {
  DepartureBoard,
  DepartureBoardCta,
} from "@/app/components/DepartureBoard";
import { getSiteContent } from "@/lib/site-content";
import {
  departureMonthOptions,
  departureRows,
  upcomingDepartureRows,
} from "@/lib/trip-filters";
import { LineFloatingButton } from "@/app/components/LineFloatingButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "出發團期總表",
  description:
    "找到了旅行社所有行程的出發日期與團費一次看，可依月份篩選，並直接查看完整行程內容。",
  alternates: { canonical: "/dates" },
};

export default async function AllDeparturesPage() {
  const content = await getSiteContent();
  const rows = upcomingDepartureRows(departureRows(content.trips));
  const months = departureMonthOptions(rows);

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

      {rows.length === 0 ? (
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
        <DepartureBoard
          rows={rows}
          months={months}
          activeMonth=""
          totalCount={rows.length}
        />
      )}

      <DepartureBoardCta lineUrl={content.lineUrl} />
    
      <LineFloatingButton lineUrl={content.lineUrl} />
    </main>
  );
}
