import Link from "next/link";
import { notFound } from "next/navigation";
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

type PageProps = { params: Promise<{ month: string }> };

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

function monthLabel(month: string) {
  const [year, monthNumber] = month.split("-");
  return `${year} 年 ${Number(monthNumber)} 月`;
}

// 每個月份一個實體路徑，「奧捷 2026年11月 出發」這類長尾查詢才有頁面可以對上。
// 舊版用 /dates?month=... 的 query string，Google 對那種網址的索引意願很低。
export async function generateMetadata({ params }: PageProps) {
  const { month } = await params;
  if (!monthPattern.test(month)) return { title: "找不到團期" };

  const label = monthLabel(month);
  return {
    title: `${label}出發團期`,
    description: `找到了旅行社 ${label} 的所有出發日期與團費，一次看完可報名的團期。`,
    alternates: { canonical: `/dates/month/${month}` },
  };
}

export default async function MonthDeparturesPage({ params }: PageProps) {
  const { month } = await params;
  if (!monthPattern.test(month)) notFound();

  const content = await getSiteContent();
  const allRows = upcomingDepartureRows(departureRows(content.trips));
  const rows = allRows.filter((row) => row.monthId === month);

  // 沒有團期的月份直接 404，避免薄內容頁面被收錄。
  if (rows.length === 0) notFound();

  const months = departureMonthOptions(allRows);
  const label = monthLabel(month);

  return (
    <main className="board-shell">
      <header className="dates-header">
        <Link className="brand" href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-logo" src="/brand/logo-mark.png" alt="" />
          <span>{content.brandName}</span>
        </Link>
        <Link className="button button-secondary button-small" href="/dates">
          全部團期
        </Link>
      </header>

      <section className="board-head">
        <p className="eyebrow">
          <span />
          DEPARTURE BOARD
        </p>
        <h1>{label}出發團期</h1>
        <p className="board-lede">
          {label}可報名的出發日期與團費，依日期由近到遠排列。
          名額與最新價格以業務顧問回覆為準。
        </p>
      </section>

      <DepartureBoard
        rows={rows}
        months={months}
        activeMonth={month}
        totalCount={allRows.length}
      />

      <DepartureBoardCta lineUrl={content.lineUrl} />
    
      <LineFloatingButton lineUrl={content.lineUrl} />
    </main>
  );
}
