import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { JsonLd } from "@/app/components/JsonLd";
import { LineFloatingButton } from "@/app/components/LineFloatingButton";
import { SiteFooter } from "@/app/components/SiteFooter";
import { SiteHeader } from "@/app/components/SiteHeader";
import { SplitText } from "@/app/components/SplitText";
import { decodePathSegment, destinationIntro, destinationTitle, findTripDestination, tripDestinations } from "@/lib/destinations";
import { socialMetadata, truncateText } from "@/lib/page-metadata";
import { getSiteContent } from "@/lib/site-content";
import { getSiteOrigin } from "@/lib/site-url";
import { breadcrumbJsonLd } from "@/lib/structured-data";
import { nextDepartureLabel } from "@/lib/trip-filters";
import { formatPrice, tripPath } from "@/lib/trip-values";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const destination = findTripDestination(tripDestinations((await getSiteContent()).trips), slug);
  if (!destination) return { title: "找不到這個目的地" };

  const places = destination.regions.map((region) => region.name).filter((name) => name !== destination.name);
  const title = `${destinationTitle(destination.name)}${places.length > 1 ? `｜${places.slice(0, 4).join("、")}` : ""}`;
  const description = truncateText(destinationIntro(destination), 160);
  return {
    title,
    description,
    alternates: { canonical: destination.path },
    ...socialMetadata({ title, description, path: destination.path, image: destination.trips[0]?.image || undefined }),
  };
}

export default async function DestinationPage({ params }: PageProps) {
  const { slug } = await params;
  const [content, origin] = await Promise.all([getSiteContent(), getSiteOrigin()]);
  const destinations = tripDestinations(content.trips);
  const destination = findTripDestination(destinations, slug);
  if (!destination) notFound();
  // 用分類名稱（/destinations/日本）進來的，轉到英文代稱，同一頁只留一個網址。
  if (decodePathSegment(slug) !== destination.slug) permanentRedirect(destination.path);

  const title = destinationTitle(destination.name);
  const crumbs = [
    { name: "首頁", path: "/" },
    { name: "旅遊目的地", path: "/destinations" },
    { name: title, path: destination.path },
  ];

  return (
    <>
      <main className="board-shell public-page">
        <a className="skip-link" href="#destination-content">跳至行程列表</a>
        <SiteHeader brandName={content.brandName} lineUrl={content.lineUrl} />
        <JsonLd
          data={[
            breadcrumbJsonLd(crumbs, origin),
            {
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              name: title,
              description: destinationIntro(destination),
              url: `${origin}${destination.path}`,
              mainEntity: {
                "@type": "ItemList",
                numberOfItems: destination.trips.length,
                itemListElement: destination.trips.map((trip, index) => ({
                  "@type": "ListItem",
                  position: index + 1,
                  name: trip.title,
                  url: `${origin}${tripPath(trip)}`,
                })),
              },
            },
          ]}
        />
        <nav className="page-breadcrumb" aria-label="麵包屑導覽">
          <Link href="/">首頁</Link><span aria-hidden="true">/</span>
          <Link href="/destinations">旅遊目的地</Link><span aria-hidden="true">/</span>
          <span aria-current="page">{title}</span>
        </nav>

        <section className="board-head" id="destination-content">
          <p className="eyebrow"><span />DESTINATION</p>
          <SplitText as="h1" text={title} />
          <p className="board-lede">{destinationIntro(destination)}</p>
        </section>

        {destination.regions.length > 1 ? (
          <nav className="month-pills" aria-label={`${destination.name}的地區`}>
            {destination.regions.map((region, index) => (
              <a className="month-pill" key={region.name} href={`#region-${index + 1}`}>
                {region.name}
                <small>{region.trips.length}</small>
              </a>
            ))}
          </nav>
        ) : null}

        <p className="board-summary">
          共 <strong>{destination.trips.length}</strong> 個行程 ・ {destination.datedCount} 個已公布團期
        </p>

        {destination.regions.map((region, index) => (
          <section className="board-group" key={region.name} id={`region-${index + 1}`}>
            <h2 className="board-group-title">
              {region.name}
              <small>{region.trips.length} 個行程</small>
            </h2>
            <div className="board-rows">
              {region.trips.map((trip) => (
                <article className="board-row" key={trip.id}>
                  <div className="board-date">{trip.days}</div>
                  <div className="board-trip">
                    <h3><Link href={tripPath(trip)}>{trip.title}</Link></h3>
                    <p>
                      <span>{trip.region}</span>
                      <span>{nextDepartureLabel(trip)}</span>
                    </p>
                  </div>
                  <div className="board-price">
                    {/洽詢/.test(trip.price) || !trip.price ? (
                      <span className="board-price-ask">價格洽詢</span>
                    ) : (
                      <strong>{formatPrice(trip.price, true)}</strong>
                    )}
                  </div>
                  <div className="board-actions">
                    <Link className="board-link primary" href={tripPath(trip)} aria-label={`查看${trip.title}行程內容`}>
                      查看行程
                    </Link>
                    <Link className="board-link" href={`/contact?trip=${encodeURIComponent(trip.id)}`} aria-label={`詢問${trip.title}`}>
                      詢問報價
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}

        <section className="board-cta">
          <div>
            <h2>還在比較，或沒看到剛好的行程？</h2>
            <p>告訴我們想去的地方、時間與人數，顧問會整理適合的選擇再與你聯繫。</p>
          </div>
          <div className="board-cta-actions">
            <a className="button" href={content.lineUrl} target="_blank" rel="noreferrer">
              LINE 聯絡顧問 <span aria-hidden="true">↗</span>
            </a>
            <Link className="button button-secondary" href="/find-trip">
              幫我找旅行 <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        {destinations.length > 1 ? (
          <nav className="dest-others" aria-label="其他目的地">
            <h2>其他目的地</h2>
            <div className="month-pills">
              {destinations.filter((item) => item.slug !== destination.slug).map((item) => (
                <Link className="month-pill" key={item.slug} href={item.path}>
                  {item.name}
                  <small>{item.trips.length}</small>
                </Link>
              ))}
            </div>
          </nav>
        ) : null}

        <LineFloatingButton lineUrl={content.lineUrl} />
      </main>
      <SiteFooter content={content} />
    </>
  );
}
