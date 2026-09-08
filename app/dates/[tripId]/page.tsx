import { TravelImage } from "@/app/components/TravelImage";
import { upcomingDepartures, formatPrice } from "@/lib/trip-values";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DepartureTable } from "@/app/components/DepartureTable";
import { TripPlanCard } from "@/app/components/TripPlanCard";
import { getSiteContent } from "@/lib/site-content";
import { LineFloatingButton } from "@/app/components/LineFloatingButton";
import { publishedTripPlans } from "@/lib/trip-plans";

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
  const plans = publishedTripPlans(trip);
  const departures = upcomingDepartures(trip.departures);

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

        <div className="trip-overview">
          <TravelImage
            src={trip.image}
            alt={`${trip.title}行程風景`}
            priority
            sizes="(max-width: 640px) 100vw, 50vw"
          />
          <div>
            <h2>旅程亮點</h2>
            <p>{trip.summary}</p>
            <strong>{formatPrice(trip.price, true)}</strong>
            <p>各團期航空、住宿與費用細節請參閱下方方案及完整行程。</p>
            <Link
              className="button"
              href={`/contact?trip=${encodeURIComponent(trip.id)}`}
            >
              諮詢這趟旅行
            </Link>
          </div>
        </div>

        {plans.length > 0 ? (
          <section className="trip-plans-section" id="plans">
            <div className="trip-plans-intro">
              <p className="eyebrow">
                <span />
                TRAVEL OPTIONS
              </p>
              <h2>
                {plans.length > 1 ? "選擇航空與行程版本" : "航空與完整行程"}
              </h2>
              <p>
                {plans.length > 1
                  ? "先比較航空、航班時段與住宿，再選出發日期，查看對應版本的 PDF 或詢問顧問。"
                  : "查看航空安排、適用團期與完整行程資料。"}
              </p>
            </div>
            <div className="trip-plan-grid">
              {plans.map((plan) => (
                <TripPlanCard
                  key={plan.id}
                  plan={plan}
                  departures={departures}
                  tripId={trip.id}
                  fallbackPrice={trip.price}
                  days={trip.days}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="trip-departures-section">
          <div className="trip-departures-heading">
            <h2>出發日期與團費</h2>
            <p>
              {plans.length > 0
                ? "可點選方案標籤回到對應的完整行程資料。"
                : "實際團位與價格請洽業務顧問確認。"}
            </p>
          </div>
          {departures.length > 0 ? (
            <DepartureTable
              departures={departures}
              plans={plans}
              tripId={trip.id}
            />
          ) : (
            <div className="dates-empty">
              出發日期規劃中，歡迎透過 LINE 詢問最新團期。
            </div>
          )}

          <p className="dates-footnote">
            日期與價格為即時參考，實際以業務顧問回覆為準。
          </p>
        </section>
      </section>

      <section className="dates-actions">
        <a
          className="button"
          href={content.lineUrl}
          target="_blank"
          rel="noreferrer"
        >
          LINE 聯絡顧問報名 <span aria-hidden="true">↗</span>
        </a>
      </section>

      <LineFloatingButton lineUrl={content.lineUrl} />
    </main>
  );
}
