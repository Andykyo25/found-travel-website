import { TravelImage } from "@/app/components/TravelImage";
import { findTripByPathKey, formatPrice, taipeiTodayTime, tripPath, upcomingDepartures } from "@/lib/trip-values";
import { getSiteOrigin } from "@/lib/site-url";
import { breadcrumbJsonLd, faqJsonLd, tripJsonLd } from "@/lib/structured-data";
import { TripItinerary, TripNotes } from "@/app/components/TripDetails";
import { resolveTripItinerary } from "@/lib/trip-itinerary";
import { getTripPdfItinerary } from "@/lib/trip-pdf-content";
import { JsonLd } from "@/app/components/JsonLd";
import Link from "next/link";
import { Fragment } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { destinationPath, destinationTitle, relatedTrips } from "@/lib/destinations";
import { socialMetadata, truncateText } from "@/lib/page-metadata";
import { DepartureTable } from "@/app/components/DepartureTable";
import { TripPlanCard } from "@/app/components/TripPlanCard";
import { getSiteContent } from "@/lib/site-content";
import { LineFloatingButton } from "@/app/components/LineFloatingButton";
import { publishedTripPlans } from "@/lib/trip-plans";
import { SiteHeader } from "@/app/components/SiteHeader";
import { SiteFooter } from "@/app/components/SiteFooter";
import { SplitText } from "@/app/components/SplitText";
import { tripFacts } from "@/lib/trip-facts";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

// 每個行程要有自己的標題與描述。原本全站共用「出發日期」一個標題，
// 對搜尋引擎來說十條行程等於十個無法區分的重複頁面。
export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const content = await getSiteContent();
  const trip = findTripByPathKey(content.trips, slug);
  if (!trip) return { title: "找不到這條行程" };

  // 多數行程沒有填團期與團費（請旅客洽詢）：標題不能說有「出發日期與團費」。
  const dated = upcomingDepartures(trip.departures).length > 0;
  const title = dated ? `${trip.title} 出發日期與團費` : `${trip.title} 行程內容與報價洽詢`;
  // 描述用「行程速覽」那一句：價格與日期跟頁面同步。業務寫的摘要常帶著當時的價格與表情符號，
  // 放進搜尋結果會和頁面上的即時起價對不上。
  const description = truncateText(tripFacts(trip, content, taipeiTodayTime()).summary, 160);

  return {
    title,
    description,
    alternates: { canonical: tripPath(trip) },
    ...socialMetadata({ title, description, path: tripPath(trip), image: trip.image || undefined }),
  };
}

export default async function TripPage({ params }: PageProps) {
  const { slug } = await params;
  const [content, origin] = await Promise.all([getSiteContent(), getSiteOrigin()]);
  const trip = findTripByPathKey(content.trips, slug);
  if (!trip) notFound();
  // 用系統編號進來、但行程已設定英文代稱：轉到代稱網址，同一頁只留一個網址。
  if (trip.slug && slug !== trip.slug) permanentRedirect(tripPath(trip));
  const plans = publishedTripPlans(trip);
  const departures = upcomingDepartures(trip.departures);
  // 麵包屑走「首頁 / 日本旅遊行程 / 這個行程」：每個行程頁都連回自己的目的地頁。
  const category = trip.badge?.trim();
  const crumbs = [
    { name: "首頁", path: "/" },
    category ? { name: destinationTitle(category), path: destinationPath(category) } : { name: "全部團期", path: "/dates" },
  ];
  const related = relatedTrips(content.trips, trip);
  // 後台沒手動填每日行程時，用行程 PDF 自動擷取的內容。
  const itinerary = resolveTripItinerary(trip, await getTripPdfItinerary(trip));
  // 一句就能引用的事實與問答（給旅客，也給 AI 搜尋）；業務自己寫的問答排在自動問答後面。
  const today = taipeiTodayTime();
  const facts = tripFacts(trip, content, today);
  const faqs = [...facts.faqs, ...(trip.faqs ?? [])];

  return (
    <>
    <main className="dates-shell public-page">
      <a className="skip-link" href="#trip-content">跳至行程內容</a>
      <SiteHeader brandName={content.brandName} lineUrl={content.lineUrl} />
      <JsonLd
        data={[
          tripJsonLd({ ...trip, itinerary: itinerary.days }, content, origin, today),
          faqJsonLd(faqs, `${origin}${tripPath(trip)}`),
          breadcrumbJsonLd([...crumbs, { name: trip.title, path: tripPath(trip) }], origin),
        ]}
      />
      <nav className="page-breadcrumb" aria-label="麵包屑導覽">{crumbs.map((crumb) => <Fragment key={crumb.path}><Link href={crumb.path}>{crumb.name}</Link><span aria-hidden="true">/</span></Fragment>)}<span aria-current="page">{trip.title}</span></nav>

      <section className="dates-card" id="trip-content">
        <div className="trip-overview">
          <div className="trip-overview-media">
            <TravelImage
              src={trip.image}
              alt={`${trip.title}行程風景`}
              priority
              sizes="(max-width: 900px) 100vw, 52vw"
            />
            <span className="fh-marks" aria-hidden="true"><b /><b /><b /><b /></span>
          </div>
          <div className="trip-overview-copy">
            <p className="eyebrow">
              <span />
              {departures.length > 0 ? "DEPARTURE DATES" : "ITINERARY"}
            </p>
            <SplitText as="h1" text={trip.title} />
            <p className="dates-meta">
              <span>{trip.region}</span>
              <span>{trip.days}</span>
            </p>
            <h2>旅程亮點</h2>
            <p>{trip.summary}</p>
            <div className="trip-overview-price">
              <small>參考價格</small>
              <strong>{formatPrice(trip.price, true)}</strong>
            </div>
            <p className="trip-overview-note">各團期航空、住宿與費用細節請參閱下方方案及完整行程。</p>
            <div className="trip-overview-actions">
              <Link
                className="button"
                href={`/contact?trip=${encodeURIComponent(trip.id)}`}
              >
                諮詢這趟旅行
              </Link>
              {itinerary.days.length ? (
                <a className="fh-link" href="#itinerary">
                  看每日行程 <span aria-hidden="true">↓</span>
                </a>
              ) : null}
              <a className="fh-link" href="#plans">
                查看航空與方案 <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>
        </div>

        <section className="trip-facts" aria-labelledby="trip-facts-title">
          <h2 id="trip-facts-title">行程速覽</h2>
          <p>{facts.summary}</p>
          <dl>
            {facts.items.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <TripItinerary itinerary={itinerary} />

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
            <h2>{departures.length > 0 ? "出發日期與團費" : "團期與報價洽詢"}</h2>
            <p>
              {departures.length === 0
                ? "這個行程的出發日期與團費，由顧問依你想出發的時間回覆。"
                : plans.length > 0
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
              告訴我們想出發的月份與人數，顧問會回覆可成行的團期與團費。{" "}
              <Link href={`/contact?trip=${encodeURIComponent(trip.id)}`}>填寫詢問表單</Link>
              ，或直接透過 LINE 聯絡。
            </div>
          )}

          <p className="dates-footnote">
            日期與價格為即時參考，實際以業務顧問回覆為準。
          </p>
        </section>

        <TripNotes trip={{ notes: trip.notes, faqs }} />
      </section>

      {related.length > 0 ? (
        <section className="trip-related" aria-labelledby="related-title">
          <h2 id="related-title">{trip.region ? `${trip.region}與鄰近地區的其他行程` : "其他行程"}</h2>
          <ul>
            {related.map((item) => (
              <li key={item.id}>
                <Link href={tripPath(item)}>{item.title}</Link>
                <span>{[item.region, item.days, formatPrice(item.price, true)].filter(Boolean).join("・")}</span>
              </li>
            ))}
          </ul>
          {category ? (
            <Link className="fh-link" href={destinationPath(category)}>
              看全部{destinationTitle(category)} <span aria-hidden="true">→</span>
            </Link>
          ) : null}
        </section>
      ) : null}

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
    <SiteFooter content={content} />
    </>
  );
}
