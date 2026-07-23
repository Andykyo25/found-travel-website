import { getSiteContent } from "@/lib/site-content";
import { TravelTools } from "./components/TravelTools";

export const dynamic = "force-dynamic";

function youtubeId(value: string) {
  const match = value.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/,
  );
  return match?.[1] ?? "BPPMpti_Z14";
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export default async function Home() {
  const content = await getSiteContent();
  const videoId = youtubeId(content.videoUrl);

  return (
    <main>
      <div className="announcement">
        <span className="announcement-dot" />
        {content.announcement}
      </div>

      <header className="site-header">
        <a className="brand" href="#top" aria-label={`${content.brandName}首頁`}>
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
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

        <div className="trip-grid">
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
                <div className="trip-highlights" aria-label="行程亮點">
                  {splitLines(trip.highlights)
                    .slice(0, 3)
                    .map((highlight) => (
                      <span key={highlight}>{highlight}</span>
                    ))}
                </div>
                <details>
                  <summary>展開行程內容</summary>
                  <ol>
                    {splitLines(trip.itinerary).map((day) => (
                      <li key={day}>{day}</li>
                    ))}
                  </ol>
                </details>
                <div className="trip-footer">
                  <span className="price">{trip.price}</span>
                  <a href="#contact" aria-label={`洽詢${trip.title}`}>
                    洽詢行程 <span aria-hidden="true">↗</span>
                  </a>
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
          <a
            href={content.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="text-link light-link"
          >
            在 YouTube 觀看 <span aria-hidden="true">↗</span>
          </a>
        </div>
        <div className="video-frame">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`}
            title={content.videoTitle}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
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
            我們是一群相信「旅行應該被好好照顧」的顧問。從第一次聊想法、挑航班與住宿，到旅途中需要協助，都由熟悉目的地的人陪你完成。
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
          <a className="button button-on-dark" href={content.lineUrl}>
            LINE 聯絡顧問 <span aria-hidden="true">↗</span>
          </a>
          <a className="contact-email" href={`mailto:${content.contactEmail}`}>
            {content.contactEmail}
          </a>
          <a className="contact-phone" href={`tel:${content.contactPhone}`}>
            {content.contactPhone}
          </a>
        </div>
      </section>

      <footer className="site-footer section-shell">
        <a className="brand footer-brand" href="#top">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span>{content.brandName}</span>
        </a>
        <p>旅行業務團隊形象網站・內容與報價以顧問最終確認為準</p>
        <div>
          <a href="#journeys">精選行程</a>
          <a href="#about">關於我們</a>
          <a href="/studio">內容管理</a>
        </div>
      </footer>
    </main>
  );
}
