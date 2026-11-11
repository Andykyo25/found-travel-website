import Link from "next/link";
import { JsonLd } from "@/app/components/JsonLd";
import { LineFloatingButton } from "@/app/components/LineFloatingButton";
import { SiteFooter } from "@/app/components/SiteFooter";
import { SiteHeader } from "@/app/components/SiteHeader";
import { SplitText } from "@/app/components/SplitText";
import { destinationTitle, tripDestinations } from "@/lib/destinations";
import { socialMetadata } from "@/lib/page-metadata";
import { getSiteContent } from "@/lib/site-content";
import { getSiteOrigin } from "@/lib/site-url";
import { breadcrumbJsonLd } from "@/lib/structured-data";

export const dynamic = "force-dynamic";

const title = "旅遊目的地總覽";
const description = "找到了旅行社的全部行程，依日本、韓國、東南亞、歐洲等目的地分類，一次看每個地區有哪些行程可以選。";

export const metadata = {
  title,
  description,
  alternates: { canonical: "/destinations" },
  ...socialMetadata({ title, description, path: "/destinations" }),
};

export default async function DestinationsPage() {
  const [content, origin] = await Promise.all([getSiteContent(), getSiteOrigin()]);
  const destinations = tripDestinations(content.trips);
  const total = destinations.reduce((sum, destination) => sum + destination.trips.length, 0);

  return (
    <>
      <main className="board-shell public-page">
        <a className="skip-link" href="#destinations-content">跳至目的地列表</a>
        <SiteHeader brandName={content.brandName} lineUrl={content.lineUrl} />
        <JsonLd data={breadcrumbJsonLd([{ name: "首頁", path: "/" }, { name: "旅遊目的地", path: "/destinations" }], origin)} />
        <nav className="page-breadcrumb" aria-label="麵包屑導覽">
          <Link href="/">首頁</Link><span aria-hidden="true">/</span>
          <span aria-current="page">旅遊目的地</span>
        </nav>

        <section className="board-head" id="destinations-content">
          <p className="eyebrow"><span />DESTINATIONS</p>
          <SplitText as="h1" text="想去哪裡，從目的地開始找。" />
          <p className="board-lede">
            目前共有 {total} 個行程，依目的地分成 {destinations.length} 類。點進去可以看到每個地區的全部行程；
            已公布團期的會列出出發日與團費，其餘可直接向顧問洽詢。
          </p>
        </section>

        <div className="board-rows">
          {destinations.map((destination) => (
            <article className="board-row" key={destination.slug}>
              <div className="board-date">{destination.trips.length} 個行程</div>
              <div className="board-trip">
                <h2><Link href={destination.path}>{destinationTitle(destination.name)}</Link></h2>
                <p>
                  {destination.regions.slice(0, 8).map((region) => <span key={region.name}>{region.name}</span>)}
                </p>
              </div>
              <div className="board-price">
                {destination.lowestPrice ? (
                  <strong>NT${destination.lowestPrice.toLocaleString("en-US")} 起</strong>
                ) : (
                  <span className="board-price-ask">價格洽詢</span>
                )}
              </div>
              <div className="board-actions">
                <Link className="board-link primary" href={destination.path} aria-label={`查看全部${destinationTitle(destination.name)}`}>
                  看全部行程
                </Link>
              </div>
            </article>
          ))}
        </div>

        <LineFloatingButton lineUrl={content.lineUrl} />
      </main>
      <SiteFooter content={content} />
    </>
  );
}
