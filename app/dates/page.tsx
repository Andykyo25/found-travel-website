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
import { SiteHeader } from "@/app/components/SiteHeader";
import { SiteFooter } from "@/app/components/SiteFooter";
import { SplitText } from "@/app/components/SplitText";

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
    <>
    <main className="board-shell public-page">
      <a className="skip-link" href="#departures-content">跳至出發團期</a>
      <SiteHeader brandName={content.brandName} lineUrl={content.lineUrl} active="/dates" />
      <nav className="page-breadcrumb" aria-label="麵包屑導覽"><Link href="/#journeys">精選行程</Link><span aria-hidden="true">/</span><span aria-current="page">出發團期</span></nav>

      <section className="board-head" id="departures-content">
        <p className="eyebrow">
          <span />
          DEPARTURE BOARD
        </p>
        <SplitText as="h1" text="出發團期總表" />
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
    <SiteFooter content={content} />
    </>
  );
}
