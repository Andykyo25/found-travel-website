import { getSiteContent } from "@/lib/site-content";
import { TravelTools } from "./components/TravelTools";

export const dynamic = "force-dynamic";

export default async function Home() {
  const content = await getSiteContent();
  const tripCount = content.trips.length <= 2 ? content.trips.length : "many";

  return (
    <main>
      <div className="announcement">
        <span className="announcement-dot" />
        {content.announcement}
      </div>

      <header className="site-header">
        <a className="brand" href="#top" aria-label={`${content.brandName}首頁`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand-logo" src="/brand/logo.png" alt="" />
          <span>{content.brandName}</span>
        </a>

        <nav className="desktop-nav" aria-label="主要導覽">
          <a href="#journeys">精選行程</a>
          <a href="#film">旅行靈感</a>
          <a href="#about">關於我們</a>
        </nav>

        <a className="button button-small" href="#contact">
          找顧問聊聊 <span aria-hidden="true">↗</span>
        </a>
      </header>

      <section className="hero section-shell" id="top">
        <div className="hero-copy">
          <p className="eyebrow">
            <span />
            {content.heroKicker}
          </p>
          <h1>{content.heroTitle}</h1>
          <p className="hero-lede">{content.heroText}</p>
          <div className="hero-actions">
            <a className="button" href="#contact">
              找顧問聊聊 <span aria-hidden="true">↗</span>
            </a>
            <a className="button button-secondary" href="#journeys">
              探索精選行程 <span aria-hidden="true">→</span>
            </a>
          </div>
          <div className="hero-trust" aria-label="服務特色">
            <span>單一顧問窗口</span>
            <span>行程逐日確認</span>
            <span>出發前後陪伴</span>
          </div>
        </div>

        <div className="hero-art" aria-label="日出與遠山的旅行意象">
          <div className="sun-ring">
            <div className="sun" />
          </div>
          <div className="cloud cloud-one" />
          <div className="cloud cloud-two" />
          <div className="mountain mountain-back" />
          <div className="mountain mountain-front" />
          <div className="route-line">
            <span className="route-star">✦</span>
          </div>
          <a className="film-card" href="#film">
            <span>
              <small>TRAVEL FILM</small>
              {content.videoTitle}
            </span>
            <span className="play" aria-hidden="true">
              ▶
            </span>
          </a>
        </div>
      </section>

      <TravelTools destination={content.destination} />

      <section className="section-shell journeys" id="journeys">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              <span />
              CURATED JOURNEYS
            </p>
            <h2>這次想去哪裡，慢慢選。</h2>
          </div>
          <p>
            不把行程塞滿，而是留下剛好的空白。每一團皆可依航班、季節與同行者需求微調。
          </p>
        </div>

        <div className="trip-grid" data-count={tripCount}>
          {content.trips.map((trip, index) => (
            <article className="trip-card" key={trip.id}>
              <div className="trip-image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={trip.image}
                  alt={`${trip.title}行程風景`}
                  loading={index === 0 ? "eager" : "lazy"}
                />
                <span className="trip-badge">{trip.badge}</span>
              </div>
              <div className="trip-body">
                <div className="trip-meta">
                  <span>{trip.region}</span>
                  <span>{trip.days}</span>
                </div>
                <h3>{trip.title}</h3>
                <p>{trip.summary}</p>
                <div className="trip-footer">
                  <span className="price">{trip.price}</span>
                  {trip.documentUrl ? (
                    <a
                      className="trip-document-link"
                      href={trip.documentUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`開啟${trip.title}完整行程`}
                    >
                      {trip.documentName} <span aria-hidden="true">↗</span>
                    </a>
                  ) : (
                    <span className="trip-document-link disabled">
                      行程資料準備中
                    </span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
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
          <a href="/studio">內容管理</a>
        </div>
      </footer>
    </main>
  );
}
