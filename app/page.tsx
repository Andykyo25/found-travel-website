import { HeroCarousel } from "./components/HeroCarousel";
import { TravelImage } from "./components/TravelImage";
import { travelerReviews } from "@/lib/traveler-reviews";
import { ParticleGlobe } from "./components/ParticleGlobe";
import Link from "next/link";
import { getSiteContent } from "@/lib/site-content";
import { getSiteOrigin } from "@/lib/site-url";
import { travelAgencyJsonLd } from "@/lib/structured-data";
import { JsonLd } from "./components/JsonLd";
import {
  categoryOptions,
  filterTrips,
  homepageTripOrder,
  monthOptions,
  readTripFilters,
  shownTripCount,
  tripFilterHref,
  tripFirstCount,
  tripMoreStep,
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
import { socialMetadata } from "@/lib/page-metadata";
import { CommunityInvite } from "@/app/components/CommunityInvite";
import { activePromotion } from "@/lib/promotions";
import { PromoCard } from "./components/PromoCard";
import { PromoPopup } from "./components/PromoPopup";

export const dynamic = "force-dynamic";

// 首頁的篩選狀態都在 query string 上（?month=、?budget=、?category=、?all=），
// canonical 一律指回 /，避免那些組合被當成一堆重複頁面。
export const metadata = {
  alternates: { canonical: "/" },
  ...socialMetadata({ title: "找到了旅行社｜好旅行，被好好照顧", description: "把每一段期待，排成剛剛好的旅程。", path: "/" }),
};

function Arrow({ direction = "right" }: { direction?: "right" | "up-right" | "down" }) {
  const path = { right: "M5 12h14m-6-6 6 6-6 6", "up-right": "M7 17 17 7M8 7h9v9", down: "M12 5v14m-6-6 6 6 6-6" }[direction];
  return (
    <svg className={`fh-arrow fh-arrow-${direction}`} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

// 首頁信任區塊的三則旅客回饋：比較後選擇 Yui、長輩同行、陪家人第一次出國。完整摘要在關於我們。
const homeReviews = ["張家界・八日旅行", "九州・家庭旅行", "陪家人第一次出國"]
  .map((journey) => travelerReviews.find((review) => review.journey === journey))
  .filter((review) => review !== undefined);

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const content = await getSiteContent();
  const filters = readTripFilters(params);
  const shown = shownTripCount(params);
  // 按過「看更多」之後：手機版從橫向滑動改成直排，切換分類時也維持展開。
  const expanded = shown > tripFirstCount;

  // 精選行程排在前面：封面照片與「旅行地圖」沿用這個順序。
  const orderedTrips = [
    ...content.trips.filter((trip) => trip.featured),
    ...content.trips.filter((trip) => !trip.featured),
  ];
  // 行程列表：最新的、有價格的排前面，沒價格的接在後面（一開始的 6 個都會是有價格的最新行程）。
  const matchedTrips = filterTrips(homepageTripOrder(content.trips), filters);
  const visibleTrips = matchedTrips.slice(0, shown);
  const remaining = matchedTrips.length - visibleTrips.length;
  // 這次新出現的第一個行程：「看更多」的連結會捲到這裡。
  const firstNewIndex = expanded ? shown - tripMoreStep : -1;
  const expandedCount = expanded ? tripFirstCount + tripMoreStep : 0;

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
    .map(({ id, slug, title, region, badge, summary, image }) => ({ id, slug, title, region, badge, summary, image }));
  const origin = await getSiteOrigin();
  // 結構化資料：讓搜尋引擎辨識這是一家旅行社，並帶出公司資訊。
  const agencyJsonLd = travelAgencyJsonLd(content, origin);
  // 進行中的活動（lib/promotions.ts）：行程列表上方的卡片與進站彈窗，過了結束日自動消失。
  const promotion = activePromotion();

  return (
    <main className="editorial-home fh" id="top">
      <a className="skip-link" href="#journeys">跳至精選行程</a>
      <JsonLd data={agencyJsonLd} />
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
          <CommunityInvite url={content.communityUrl} />
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

          {promotion ? <PromoCard promotion={promotion} /> : null}

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
                href={tripFilterHref({ ...filters, category: "" }, expandedCount)}
                aria-current={filters.category ? undefined : "true"}
              >
                全部
              </Link>
              {categories.map((category) => (
                <Link
                  key={category}
                  className={`fh-pill${filters.category === category ? " active" : ""}`}
                  href={tripFilterHref({ ...filters, category }, expandedCount)}
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
            <div className={`fh-grid${expanded ? " is-all" : ""}`}>
              {visibleTrips.map((trip, index) => (
                <PackageCard key={trip.id} trip={trip} index={index} id={index === firstNewIndex ? "more-trips" : undefined} />
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
            {remaining > 0 ? (
              <Link className="fh-link" href={tripFilterHref(filters, shown + tripMoreStep, "more-trips")}>
                看更多行程（還有 {remaining} 個） <Arrow />
              </Link>
            ) : null}
            <Link className="fh-link" href="/destinations">
              依目的地瀏覽 <Arrow />
            </Link>
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
              和 Yui 聊聊旅程 <Arrow direction="up-right" />
            </a>
          </div>
        </div>
        <div className="fh-film-stage" data-track="enter">
          <FilmPlayer src={content.videoUrl} title={content.videoTitle} poster="/media/film-poster-danang.jpg" />
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
          {/* 信任區塊只放大綱：Yui 本人、三則旅客回饋、服務保障；完整內容在關於我們。 */}
          <div className="fh-why-grid">
            <figure className="fh-why-photo" data-rv>
              <TravelImage src="/about/yui-hanbok.jpg" alt="Yui 穿著韓服，站在山城的觀景台上" sizes="(max-width: 760px) 100vw, 40vw" />
              <figcaption>
                <strong>Yui</strong>
                <span>你的旅行顧問・走過 20 多個國家、在日本生活五年</span>
              </figcaption>
            </figure>

            <div className="fh-why-main">
              <div className="fh-why-body" data-rv>
                <p>
                  找到了旅行社相信「旅行應該被好好照顧」。從第一次聊想法、挑航班與住宿，到旅途中需要協助，都由 Yui 陪你完成。
                </p>
              </div>

              <div className="fh-why-block" data-rv>
                <h3>旅人怎麼說</h3>
                <ul className="fh-why-reviews">
                  {homeReviews.map((review) => (
                    <li key={review.sourceUrl}>
                      <span className="fh-why-stars" aria-label={`${review.rating} 顆星`}>★★★★★</span>
                      <strong>{review.title}</strong>
                      <small>{review.journey}・Google 評論摘要</small>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="fh-why-block" data-rv>
                <h3>服務保障</h3>
                <ul className="fh-why-promises">
                  <li><strong>合法立案的綜合旅行社</strong><small>{content.businessLicense}</small></li>
                  <li><strong>品保協會會員</strong><small>{content.qualityLicense}</small></li>
                  <li><strong>從諮詢到回國，同一個窗口</strong><small>行前提醒、當地變動與回程協助，都找得到 Yui</small></li>
                </ul>
              </div>

              <Link className="fh-link" href="/about#traveler-stories" data-rv>
                認識 Yui・看全部旅人好評 <Arrow direction="up-right" />
              </Link>
            </div>
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
              LINE 找 Yui 聊旅行 <Arrow direction="up-right" />
            </a>
            <Link className="fh-btn fh-btn-ghost fh-btn-lg" href="/contact" data-magnetic>
              請 Yui 幫我規劃 <Arrow />
            </Link>
            <span className="fh-contact-company">{content.companyName}</span>
          </div>
        </div>
      </section>

      <SiteFooter content={content} home />

      <LineFloatingButton lineUrl={content.lineUrl} />
      {promotion ? <PromoPopup promotion={promotion} /> : null}
    </main>
  );
}
