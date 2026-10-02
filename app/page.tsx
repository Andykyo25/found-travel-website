import type { CSSProperties } from "react";
import { HeroCarousel } from "./components/HeroCarousel";
import { ParticleGlobe } from "./components/ParticleGlobe";
import Link from "next/link";
import { getSiteContent } from "@/lib/site-content";
import { getSiteOrigin } from "@/lib/site-url";
import {
  categoryOptions,
  filterTrips,
  monthOptions,
  readTripFilters,
  tripFilterHref,
} from "@/lib/trip-filters";
import { SiteHeader } from "./components/SiteHeader";
import { JourneyAtlas } from "./components/JourneyAtlas";
import { FilmPlayer } from "./components/FilmPlayer";
import { HomeIntro } from "./components/HomeIntro";
import { PackageCard } from "./components/PackageCard";
import { SiteFooter } from "./components/SiteFooter";
import { SplitText } from "./components/SplitText";
import { TravelTools } from "./components/TravelTools";
import { TripFilterBar } from "./components/TripFilterBar";
import { LineFloatingButton } from "./components/LineFloatingButton";

export const dynamic = "force-dynamic";

// 首頁的篩選狀態都在 query string 上（?month=、?budget=、?category=、?all=），
// canonical 一律指回 /，避免那些組合被當成一堆重複頁面。
export const metadata = {
  alternates: { canonical: "/" },
};

const visibleTripLimit = 6;

function Arrow({ direction = "right" }: { direction?: "right" | "up-right" | "down" }) {
  const path = { right: "M5 12h14m-6-6 6 6-6 6", "up-right": "M7 17 17 7M8 7h9v9", down: "M12 5v14m-6-6 6 6 6-6" }[direction];
  return (
    <svg className={`fh-arrow fh-arrow-${direction}`} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const content = await getSiteContent();
  const filters = readTripFilters(params);
  const showAll = params.all === "1";

  // 精選行程排在前面，其餘接著顯示，兩者共用同一個列表與篩選。
  const orderedTrips = [
    ...content.trips.filter((trip) => trip.featured),
    ...content.trips.filter((trip) => !trip.featured),
  ];
  const matchedTrips = filterTrips(orderedTrips, filters);
  const visibleTrips = showAll
    ? matchedTrips
    : matchedTrips.slice(0, visibleTripLimit);
  const hasMore = matchedTrips.length > visibleTrips.length;

  const months = monthOptions(content.trips);
  const categories = categoryOptions(content.trips);
  const regions = [...new Set(content.trips.map((trip) => trip.region))];
  const heroImage =
    content.heroImage || orderedTrips[0]?.image || "/trips/tokyo.jpg";
  const hasFilters = Boolean(
    filters.month || filters.budget || filters.category || filters.region || filters.keyword,
  );
  const atlasJourneys = orderedTrips
    .filter((trip, index, all) => all.findIndex((item) => item.badge === trip.badge) === index)
    .slice(0, 4)
    .map(({ id, title, region, badge, summary, image }) => ({ id, title, region, badge, summary, image }));
  // 公告可由後台編輯：以「・」分段，重複排列成跑馬燈。
  const origin = await getSiteOrigin();
  // 結構化資料：讓搜尋引擎辨識這是一家旅行社，並帶出公司資訊。
  const agencyJsonLd = {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: content.companyName,
    alternateName: content.brandName,
    url: origin,
    image: `${origin}/og-railway.png`,
    logo: `${origin}/brand/logo.png`,
    taxID: content.taxId,
    address: { "@type": "PostalAddress", streetAddress: content.address, addressCountry: "TW" },
    sameAs: [content.lineUrl],
  };
  const marqueeItems = content.announcement.split(/[・|｜]/).map((item) => item.trim()).filter(Boolean);

  return (
    <main className="editorial-home fh" id="top">
      <a className="skip-link" href="#journeys">跳至精選行程</a>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(agencyJsonLd).replace(/</g, "\\u003c") }}
      />
      <HomeIntro />
      <SiteHeader brandName={content.brandName} lineUrl={content.lineUrl} home />

      {/* hero-full：滿版封面，照片為輪播，標題逐字升起 */}
      <section className="fh-hero hero-full" aria-labelledby="cover-title" data-track="exit">
        <HeroCarousel images={content.heroImages.length ? content.heroImages : [heroImage]} />
        <span className="fh-hero-scrim" aria-hidden="true" />
        <span className="fh-grain" aria-hidden="true" />
        <span className="fh-marks fh-marks-hero" aria-hidden="true"><b /><b /><b /><b /></span>

        <div className="fh-hero-copy">
          <p className="fh-kicker">
            <span className="fh-kicker-no">01</span>
            <span className="fh-kicker-rule" aria-hidden="true" />
            {content.heroKicker}
          </p>
          <SplitText as="h1" id="cover-title" className="fh-title" text={content.heroTitle} intro start={520} step={42} />
          <div className="fh-cta">
            <a className="fh-btn fh-btn-light" href="#journeys" data-magnetic>
              探索精選行程 <Arrow direction="up-right" />
            </a>
            <Link className="fh-link fh-link-light" href="/find-trip">
              還沒想好？幫我找旅行 <Arrow />
            </Link>
          </div>
        </div>
        <p className="fh-hero-note" aria-hidden="true">世界很大，剛好有你。</p>
        <a className="fh-scroll" href="#intro" aria-label="向下捲動">
          <span>SCROLL</span>
          <i aria-hidden="true" />
        </a>
      </section>

      <div className="fh-marquee" role="group" aria-label={content.announcement}>
        <div className="fh-marquee-track" aria-hidden="true">
          {[0, 1].map((group) => (
            <ul key={group}>
              {Array.from({ length: 3 }, () => marqueeItems).flat().map((item, index) => (
                <li key={index} className={index >= marqueeItems.length ? "is-copy" : undefined}>
                  <span>{item}</span>
                  <i />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>

      <section className="fh-finder" id="intro" aria-labelledby="finder-home-title">
        <div className="fh-wrap fh-finder-grid">
          <div className="fh-finder-copy">
            <p className="fh-eyebrow" data-rv><i>02</i>你的旅行，從一點想法開始</p>
            <SplitText as="h2" id="finder-home-title" className="fh-h2" text="還沒決定去哪？一起找到適合你的旅行。" />
            <p className="fh-lede" data-rv>
              跟團、自組客製，或只需要機票與住宿。<br />
              回答 5 個小問題，把期待慢慢變成旅行計畫。
            </p>
            <div className="fh-actions" data-rv>
              <Link className="fh-btn" href="/find-trip" data-magnetic>
                幫我找旅行・開始整理需求 <Arrow />
              </Link>
              <Link className="fh-link" href="#journeys">
                我有方向，直接看行程 <Arrow direction="down" />
              </Link>
            </div>
            <small className="fh-note" data-rv>不用登入、不必先留電話，還沒想好也可以。</small>
          </div>
          <JourneyAtlas journeys={atlasJourneys} />
        </div>
      </section>

      <section className="fh-tools" aria-labelledby="tools-title">
        <div className="fh-wrap">
          <div className="fh-tools-head" data-rv>
            <p className="fh-eyebrow"><i>—</i>BEFORE YOU GO</p>
            <h2 id="tools-title">出發前的小筆記</h2>
            <span>天氣、匯率與當地生活，一起準備好。</span>
          </div>
          <TravelTools destination={content.destination} />
        </div>
      </section>

      <section className="fh-journeys" id="journeys">
        <div className="fh-wrap">
          <header className="fh-section-head">
            <p className="fh-eyebrow" data-rv><i>03</i>SELECTED JOURNEYS</p>
            <SplitText as="h2" className="fh-h2" text="這次想去哪裡，慢慢選。" />
            <p className="fh-section-lede" data-rv>
              不把行程塞滿，而是留下剛好的空白。每一團皆可依航班、季節與同行者需求微調。
            </p>
          </header>

          <TripFilterBar
            key={`packages-${filters.month}-${filters.budget}-${filters.category}-${filters.region}-${filters.keyword}`}
            months={months}
            regions={regions}
            filters={filters}
          />

          {categories.length > 0 ? (
            <nav className="fh-pills" aria-label="行程分類">
              <Link
                className={`fh-pill${filters.category ? "" : " active"}`}
                href={tripFilterHref({ ...filters, category: "" }, showAll)}
                aria-current={filters.category ? undefined : "true"}
              >
                全部
              </Link>
              {categories.map((category) => (
                <Link
                  key={category}
                  className={`fh-pill${filters.category === category ? " active" : ""}`}
                  href={tripFilterHref({ ...filters, category }, showAll)}
                  aria-current={filters.category === category ? "true" : undefined}
                >
                  {category}
                </Link>
              ))}
            </nav>
          ) : null}

          <div className="fh-caption">
            <span>{hasFilters ? "YOUR SELECTION" : "THE JOURNEY COLLECTION"}</span>
            <span role="status">
              {filters.keyword ? `「${filters.keyword}」` : ""}
              {matchedTrips.length} 個行程
              {hasFilters ? (
                <>
                  {" "}· <Link href="/#journeys">清除全部篩選</Link>
                </>
              ) : (
                "，各有自己的風景。"
              )}
            </span>
          </div>

          {visibleTrips.length > 0 ? (
            <div className={`fh-grid${showAll ? " is-all" : ""}`}>
              {visibleTrips.map((trip, index) => (
                <PackageCard key={trip.id} trip={trip} index={index} />
              ))}
            </div>
          ) : (
            <div className="fh-empty">
              <p>目前沒有符合條件的行程。</p>
              {hasFilters ? (
                <Link className="fh-btn" href="/#journeys">
                  清除篩選條件
                </Link>
              ) : null}
            </div>
          )}

          <div className="fh-more">
            {hasMore ? (
              <Link className="fh-link" href={tripFilterHref(filters, true)}>
                看更多行程 <Arrow />
              </Link>
            ) : null}
            <Link className="fh-link" href="/dates">
              查看全部出發團期 <Arrow />
            </Link>
          </div>
        </div>
      </section>

      <section className="fh-film" id="film">
        <div className="fh-wrap fh-film-head">
          <div>
            <p className="fh-eyebrow fh-eyebrow-light" data-rv><i>04</i>TRAVEL FILM</p>
            <SplitText as="h2" className="fh-h2" text="先感受，再決定要去哪裡。" />
          </div>
          <div className="fh-film-aside" data-rv>
            <p>旅行的樣子，很難只靠文字說完。看一段片，感受城市的呼吸、山野的光，以及你想留下的步調。</p>
            <a className="fh-link fh-link-light" href="#contact">
              和顧問聊聊旅程 <Arrow direction="up-right" />
            </a>
          </div>
        </div>
        <div className="fh-film-stage" data-track="enter">
          <FilmPlayer src={content.videoUrl} title={content.videoTitle} poster="/media/film-poster.jpg" />
        </div>
        <p className="fh-film-caption fh-wrap" data-rv>
          <span>TRAVEL, IN MOTION</span>
          <span>為下一段旅程，留一點想像。</span>
        </p>
      </section>

      <section className="fh-why" id="about" aria-labelledby="why-title">
        <ParticleGlobe />
        <div className="fh-wrap">
          <p className="fh-eyebrow" data-rv><i>05</i>WHY FOUND</p>
          <SplitText as="h2" id="why-title" className="fh-statement" text="找到的不只是景點，是適合你的旅行方式。" lit track="enter" />
          <div className="fh-why-body" data-rv>
            <p>
              找到了旅行社相信「旅行應該被好好照顧」。從第一次聊想法、挑航班與住宿，到旅途中需要協助，都由熟悉目的地的業務顧問陪你完成。
            </p>
            <Link className="fh-link" href="/about">
              認識我們・閱讀旅人好評 <Arrow direction="up-right" />
            </Link>
          </div>
          <div className="fh-values">
            {[
              ["01", "先聽，再排行程", "從同行者、體力與在意的小事開始，不套用制式答案。"],
              ["02", "資訊說清楚", "費用、自由活動、移動時間與風險，在出發前完整確認。"],
              ["03", "旅途中找得到人", "行前提醒、當地變動與回程協助，都有同一個窗口接手。"],
            ].map(([no, title, text], index) => (
              <article key={no} data-rv style={{ "--rv-i": index } as CSSProperties}>
                <span className="fh-value-no">{no}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="fh-contact" id="contact" aria-labelledby="contact-title">
        <div className="fh-wrap fh-contact-grid">
          <div>
            <p className="fh-eyebrow fh-eyebrow-light" data-rv><i>06</i>LET&apos;S FIND YOUR WAY</p>
            <SplitText as="h2" id="contact-title" className="fh-h2 fh-h2-xl" text={content.contactTitle} />
            <p className="fh-contact-text" data-rv>{content.contactText}</p>
          </div>
          <div className="fh-contact-actions" data-rv>
            <a className="fh-btn fh-btn-light fh-btn-lg" href={content.lineUrl} target="_blank" rel="noreferrer" data-magnetic>
              LINE 聯絡顧問 <Arrow direction="up-right" />
            </a>
            <Link className="fh-btn fh-btn-ghost fh-btn-lg" href="/contact" data-magnetic>
              填寫聯絡表單 <Arrow />
            </Link>
            <span className="fh-contact-company">{content.companyName}</span>
          </div>
        </div>
      </section>

      <SiteFooter content={content} home />

      <LineFloatingButton lineUrl={content.lineUrl} />
    </main>
  );
}
