import Link from "next/link";
import { getSiteContent } from "@/lib/site-content";
import {
  categoryOptions,
  filterTrips,
  monthOptions,
  readTripFilters,
  tripFilterHref,
} from "@/lib/trip-filters";
import { PackageCard } from "./components/PackageCard";
import { TravelTools } from "./components/TravelTools";
import { TripFilterBar } from "./components/TripFilterBar";

export const dynamic = "force-dynamic";

const visibleTripLimit = 6;

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
  const heroImage = orderedTrips[0]?.image ?? "/trips/tokyo.jpg";
  const hasFilters = Boolean(
    filters.month || filters.budget || filters.category,
  );

  return (
    <main>
      <div className="announcement">
        <span className="announcement-dot" />
        {content.announcement}
      </div>

      <section className="hero-full" id="top">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="hero-media" src={heroImage} alt="" />
        <span className="hero-scrim" aria-hidden="true" />

        <div className="hero-inner">
          <header className="hero-bar">
            <a
              className="brand hero-brand"
              href="#top"
              aria-label={`${content.brandName}首頁`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="brand-logo" src="/brand/logo.png" alt="" />
              <span>{content.brandName}</span>
            </a>

            <nav className="hero-nav" aria-label="主要導覽">
              <a className="active" href="#top">
                首頁
              </a>
              <a href="#journeys">精選行程</a>
              <a href="#film">旅行靈感</a>
              <a href="#about">關於我們</a>
            </nav>

            <div className="hero-bar-actions">
              <Link className="button button-small" href="/contact">
                聯絡表單 <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </header>

          <div className="hero-center">
            <p className="hero-kicker">{content.heroKicker}</p>
            <h1 className="hero-title">{content.heroTitle}</h1>
            <p className="hero-sub">{content.heroText}</p>
            {/* key 讓網址篩選條件改變時重新掛載，兩條搜尋列才不會顯示舊值。 */}
            <TripFilterBar
              key={`hero-${filters.month}-${filters.budget}`}
              months={months}
              filters={filters}
              tone="on-image"
            />
          </div>
        </div>
      </section>

      <TravelTools destination={content.destination} />

      <section className="packages section-shell" id="journeys">
        <div className="packages-head">
          <p className="eyebrow eyebrow-center">
            <span />
            EXPLORE POPULAR PACKAGE
            <span />
          </p>
          <h2>這次想去哪裡，慢慢選。</h2>
          <p>
            不把行程塞滿，而是留下剛好的空白。每一團皆可依航班、季節與同行者需求微調。
          </p>
        </div>

        <TripFilterBar
          key={`packages-${filters.month}-${filters.budget}`}
          months={months}
          filters={filters}
        />

        {categories.length > 0 ? (
          <nav className="category-pills" aria-label="行程分類">
            <Link
              className={`category-pill${filters.category ? "" : " active"}`}
              href={tripFilterHref({ ...filters, category: "" }, showAll)}
            >
              全部
            </Link>
            {categories.map((category) => (
              <Link
                key={category}
                className={`category-pill${
                  filters.category === category ? " active" : ""
                }`}
                href={tripFilterHref({ ...filters, category }, showAll)}
              >
                {category}
              </Link>
            ))}
          </nav>
        ) : null}

        {visibleTrips.length > 0 ? (
          <div className="package-grid">
            {visibleTrips.map((trip, index) => (
              <PackageCard key={trip.id} trip={trip} priority={index === 0} />
            ))}
          </div>
        ) : (
          <div className="packages-empty">
            <p>目前沒有符合條件的行程。</p>
            {hasFilters ? (
              <Link className="button button-secondary" href="/#journeys">
                清除篩選條件
              </Link>
            ) : null}
          </div>
        )}

        {hasMore ? (
          <div className="packages-more">
            <Link
              className="explore-more"
              href={tripFilterHref(filters, true)}
            >
              看更多行程 <span aria-hidden="true">→</span>
            </Link>
          </div>
        ) : null}
      </section>

      <section className="film-section section-shell" id="film">
        <div className="film-copy">
          <p className="eyebrow light">
            <span />
            TRAVEL FILM
          </p>
          <h2>先感受，再決定要去哪裡。</h2>
          <p>
            旅行的樣子，很難只靠文字說完。看一段片，感受城市的呼吸、山野的光，以及你想留下的步調。
          </p>
          <a href="#contact" className="text-link light-link">
            和顧問聊聊旅程 <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div className="video-frame">
          <video
            src={content.videoUrl}
            title={content.videoTitle}
            controls
            playsInline
            preload="metadata"
          >
            您的瀏覽器不支援影片播放。
          </video>
        </div>
      </section>

      <section className="about section-shell" id="about">
        <div className="about-card">
          <p className="eyebrow">
            <span />
            WHY FOUND
          </p>
          <h2>找到的不只是景點，是適合你的旅行方式。</h2>
          <p>
            找到了旅行社相信「旅行應該被好好照顧」。從第一次聊想法、挑航班與住宿，到旅途中需要協助，都由熟悉目的地的業務顧問陪你完成。
          </p>
        </div>
        <div className="values-grid">
          <article>
            <span>01</span>
            <h3>先聽，再排行程</h3>
            <p>從同行者、體力與在意的小事開始，不套用制式答案。</p>
          </article>
          <article>
            <span>02</span>
            <h3>資訊說清楚</h3>
            <p>費用、自由活動、移動時間與風險，在出發前完整確認。</p>
          </article>
          <article>
            <span>03</span>
            <h3>旅途中找得到人</h3>
            <p>行前提醒、當地變動與回程協助，都有同一個窗口接手。</p>
          </article>
        </div>
      </section>

      <section className="contact section-shell" id="contact">
        <div>
          <p className="eyebrow light">
            <span />
            LET&apos;S FIND YOUR WAY
          </p>
          <h2>{content.contactTitle}</h2>
          <p>{content.contactText}</p>
        </div>
        <div className="contact-actions">
          <a
            className="button button-on-dark"
            href={content.lineUrl}
            target="_blank"
            rel="noreferrer"
          >
            LINE 聯絡顧問 <span aria-hidden="true">↗</span>
          </a>
          <Link className="button button-on-dark-ghost" href="/contact">
            填寫聯絡表單 <span aria-hidden="true">→</span>
          </Link>
          <span className="contact-company">{content.companyName}</span>
        </div>
      </section>

      <footer className="site-footer section-shell">
        <div className="footer-identity">
          <a className="brand footer-brand" href="#top">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="brand-logo" src="/brand/logo.png" alt="" />
            <span>{content.brandName}</span>
          </a>
          <p>內容與報價以業務顧問最終確認為準</p>
        </div>
        <div className="company-details">
          <strong>{content.companyName}</strong>
          <span>{content.businessLicense}</span>
          <span>{content.qualityLicense}</span>
          <span>
            統一編號 {content.taxId} │ 負責人 {content.representative}
          </span>
          <span>地址：{content.address}</span>
        </div>
        <div className="footer-links">
          <a href="#journeys">精選行程</a>
          <a href="#about">關於我們</a>
          <Link href="/contact">聯絡表單</Link>
          <a href="/studio">內容管理</a>
        </div>
      </footer>
    </main>
  );
}
