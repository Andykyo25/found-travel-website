import Link from "next/link";
import { notFound } from "next/navigation";
import { DepartureTable } from "@/app/components/DepartureTable";
import { getSiteContent } from "@/lib/site-content";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ tripId: string }> };

// 每個行程要有自己的標題與描述。原本全站共用「出發日期」一個標題，
// 對搜尋引擎來說十條行程等於十個無法區分的重複頁面。
export async function generateMetadata({ params }: PageProps) {
  const { tripId } = await params;
  const content = await getSiteContent();
  const trip = content.trips.find((item) => item.id === tripId);
  if (!trip) return { title: "找不到這條行程" };

  const description = `${trip.title}（${trip.region}・${trip.days}）的出發日期與團費。${trip.summary}`;

  return {
    title: `${trip.title} 出發日期與團費`,
    description: description.slice(0, 160),
    alternates: { canonical: `/dates/${trip.id}` },
    openGraph: {
      title: `${trip.title} 出發日期與團費`,
      description: description.slice(0, 160),
      images: trip.image ? [trip.image] : undefined,
    },
  };
}

export default async function TripDatesPage({ params }: PageProps) {
  const { tripId } = await params;
  const content = await getSiteContent();
  const trip = content.trips.find((item) => item.id === tripId);
  if (!trip) notFound();

  return (
    <main className="dates-shell">
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

      <section className="dates-card">
        <p className="eyebrow">
          <span />
          DEPARTURE DATES
        </p>
        <h1>{trip.title}</h1>
        <p className="dates-meta">
          <span>{trip.region}</span>
          <span>{trip.days}</span>
        </p>

        {trip.departures.length > 0 ? (
          <DepartureTable departures={trip.departures} />
        ) : (
          <div className="dates-empty">
            出發日期規劃中，歡迎透過 LINE 詢問最新團期。
          </div>
        )}

        <p className="dates-footnote">
          日期與價格為即時參考，實際以業務顧問回覆為準。
        </p>
      </section>

      <section className="dates-actions">
        {trip.documentUrl ? (
          <a
            className="button button-secondary"
            href={trip.documentUrl}
            target="_blank"
            rel="noreferrer"
          >
            查看行程內容 <span aria-hidden="true">↗</span>
          </a>
        ) : null}
        <a
          className="button"
          href={content.lineUrl}
          target="_blank"
          rel="noreferrer"
        >
          LINE 聯絡顧問報名 <span aria-hidden="true">↗</span>
        </a>
      </section>
    </main>
  );
}
