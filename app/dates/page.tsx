import Link from "next/link";
import {
  DepartureBoard,
  DepartureBoardCta,
} from "@/app/components/DepartureBoard";
import { getSiteContent } from "@/lib/site-content";
import { socialMetadata } from "@/lib/page-metadata";
import { getSiteOrigin } from "@/lib/site-url";
import { breadcrumbJsonLd } from "@/lib/structured-data";
import { JsonLd } from "@/app/components/JsonLd";
import {
  departureMonthOptions,
  departureRows,
  upcomingDepartureRows,
} from "@/lib/trip-filters";
import { LineFloatingButton } from "@/app/components/LineFloatingButton";
import { SiteHeader } from "@/app/components/SiteHeader";
import { SiteFooter } from "@/app/components/SiteFooter";
import { SplitText } from "@/app/components/SplitText";
import { CommunityInline, CommunityInvite } from "@/app/components/CommunityInvite";

export const dynamic = "force-dynamic";

const title = "出發團期總表：日本、韓國、歐洲、東南亞跟團日期與團費";
const description = "找到了旅行社日本、韓國、歐洲、東南亞等跟團行程的出發日期與團費一次看，可依出發月份篩選，點進去就是完整行程內容；想問的日期沒列出來，也可以直接 LINE 詢問顧問。";

export const metadata = {
  title,
  description,
  alternates: { canonical: "/dates" },
  ...socialMetadata({ title, description, path: "/dates" }),
};

export default async function AllDeparturesPage() {
  const [content, origin] = await Promise.all([getSiteContent(), getSiteOrigin()]);
  const rows = upcomingDepartureRows(departureRows(content.trips));
  const months = departureMonthOptions(rows);

  return (
    <>
    <main className="board-shell public-page">
      <a className="skip-link" href="#departures-content">跳至出發團期</a>
      <SiteHeader brandName={content.brandName} lineUrl={content.lineUrl} active="/dates" />
      <JsonLd data={breadcrumbJsonLd([{ name: "精選行程", path: "/" }, { name: "出發團期", path: "/dates" }], origin)} />
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
          <CommunityInline url={content.communityUrl} text="想第一時間知道新團期？" />
        </div>
      ) : (
        <DepartureBoard
          rows={rows}
          months={months}
          activeMonth=""
          totalCount={rows.length}
        />
      )}

      <CommunityInvite url={content.communityUrl} title="開團消息，社群先知道" text="新團期、剩餘名額與早鳥優惠，會先在社群公布。不想錯過開團，加入社群就能收到通知。" />

      <DepartureBoardCta lineUrl={content.lineUrl} />

      <LineFloatingButton lineUrl={content.lineUrl} />
    </main>
    <SiteFooter content={content} />
    </>
  );
}
