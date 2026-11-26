import type { Metadata } from "next";
import Link from "next/link";
import { getSiteContent } from "@/lib/site-content";
import { socialMetadata } from "@/lib/page-metadata";
import { googleMapsPlaceUrl, travelerReviews } from "@/lib/traveler-reviews";
import { SiteHeader } from "@/app/components/SiteHeader";
import { SiteFooter } from "@/app/components/SiteFooter";
import { TravelImage } from "@/app/components/TravelImage";
import { tokyoNikkiUrl } from "@/app/components/SocialLinks";
import { LineFloatingButton } from "@/app/components/LineFloatingButton";
import { JsonLd } from "@/app/components/JsonLd";
import { agencyId, consultantId, consultantJsonLd, travelAgencyJsonLd } from "@/lib/structured-data";
import { getSiteOrigin } from "@/lib/site-url";
import { FilmDeck } from "./FilmDeck";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "關於 Yui｜Tabiyoi 好旅，從遇見對的人開始",
  description: "認識旅行顧問 Yui：走訪超過 20 個國家、在日本生活五年。從全球深度旅遊、私人訂製、高爾夫滑雪主題假期到企業獎勵旅遊，陪你找到真正適合自己的旅行方式。",
  alternates: { canonical: "/about" },
  ...socialMetadata({ title: "關於 Yui", description: "Tabiyoi｜好旅，從遇見對的人開始。認識 Yui，也聽聽旅人的故事。", path: "/about" }),
};

const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`;

type Service = {
  number: string;
  english: string;
  title: string;
  text: string;
  href: string;
  action: string;
  photos: { src: string; alt: string }[];
};

const services: Service[] = [
  {
    number: "01",
    english: "GLOBAL TRAVEL SPECIALIST",
    title: "全球深度旅遊規劃",
    text: "擁有走訪超過 20 個國家的旅行經驗，親自感受世界各地的文化、風景與生活方式。其中更曾在日本生活五年，深入了解當地文化與旅遊特色。從經典必訪、季節限定美景到特色住宿與深度體驗，結合實際旅行經驗與專業規劃，為你挑選不只是熱門，更真正適合自己的旅行方式。",
    href: "/#journeys",
    action: "看看 Yui 的精選行程",
    photos: [{ src: unsplash("1771773563156-2f32863f2c7c"), alt: "夜裡掛著燈籠的日式傳統建築，門口透出暖黃燈光" }],
  },
  {
    number: "02",
    english: "BESPOKE PRIVATE JOURNEYS",
    title: "高端私人訂製旅行",
    text: "不想跟著制式團體走？從私人小團、高品質住宿、特色餐飲到專屬交通與在地體驗，依照你的預算、喜好及旅行節奏，打造更有質感的專屬假期。",
    href: "/find-trip",
    action: "和 Yui 聊聊你的旅行想法",
    photos: [{ src: unsplash("1768397003906-42198d76b484"), alt: "以花鳥屏風裝飾的高雅飯店休息室" }],
  },
  {
    number: "03",
    english: "GOLF & SKI EXPERIENCES",
    title: "高爾夫・滑雪主題假期",
    text: "各地高爾夫球場、滑雪場及合作教練資源，協助安排球場、飯店、交通、專業指導及同行者行程，讓興趣成為一趟完整的旅行體驗。",
    href: "/contact",
    action: "洽詢主題假期",
    photos: [
      { src: unsplash("1758190153295-710199944b73"), alt: "林木環繞、修剪整齊的高爾夫球場草坪" },
      { src: unsplash("1708115106914-65655e8414da"), alt: "滑雪者在覆滿霧凇的山坡上滑過粉雪，遠方是海岸線" },
    ],
  },
  {
    number: "04",
    english: "CORPORATE & INCENTIVE TRAVEL",
    title: "企業員工旅遊・獎勵旅遊",
    text: "從企業員旅、團隊獎勵旅行、商務參訪到特殊主題活動，協助整合預算、機票、住宿、交通與團體需求，讓活動規劃更有方向、執行更有效率。",
    href: "/contact",
    action: "洽詢團體規劃",
    photos: [{ src: unsplash("1506869640319-fe1a24fd76dc"), alt: "一群人站在山頂高舉雙手，背後是日出的金色天空" }],
  },
];

// 開頭兩條膠捲：Yui 在各地旅行的照片。上排往左流、下排往右流。
const filmRows = [
  [
    { src: "/about/yui-mount-fuji.jpg", alt: "Yui 在湖畔，背後是白雪覆頂的富士山", tag: "日本富士山" },
    { src: "/about/yui-bangkok-wat-arun.jpg", alt: "Yui 在曼谷河畔，對岸是點燈的鄭王廟", tag: "泰國曼谷" },
    { src: "/about/yui-matterhorn.jpg", alt: "Yui 在湖邊，背後是倒映在水面的馬特洪峰", tag: "瑞士馬特洪峰" },
    { src: "/about/yui-shanghai-bund.jpg", alt: "Yui 在上海外灘夜晚的街頭，遠方是東方明珠塔", tag: "上海外灘" },
    { src: "/about/yui-ginkgo.jpg", alt: "Yui 坐在滿地金黃的銀杏落葉上", tag: "秋天的銀杏" },
  ],
  [
    { src: "/about/yui-san-francisco.jpg", alt: "Yui 坐在欄杆上，背後是舊金山金門大橋", tag: "舊金山金門大橋" },
    { src: "/about/yui-busan-sky-capsule.jpg", alt: "Yui 在釜山海岸的天空膠囊列車車廂裡", tag: "韓國釜山" },
    { src: "/about/yui-tokyo-disneyland.jpg", alt: "Yui 在東京迪士尼樂園的城堡前", tag: "東京迪士尼" },
    { src: "/about/yui-cruise.jpg", alt: "Yui 在郵輪上和穿船長服的米奇合照", tag: "郵輪旅行" },
    { src: "/about/yui-canal-town.jpg", alt: "Yui 在越南富國島的橋上，背後是運河與彩色的歐式街屋", tag: "越南富國島" },
  ],
];

function ReviewCredit({ review }: { review: (typeof travelerReviews)[number] }) {
  return <div className={styles.reviewCredit}>
    <div><span>Google Maps 旅客回饋</span></div>
    <a href={review.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`閱讀「${review.journey}」的 Google 評論原文（另開分頁）`}>閱讀原文 <span aria-hidden="true">↗</span></a>
  </div>;
}

export default async function AboutPage() {
  const content = await getSiteContent();
  const [featured, ...reviews] = travelerReviews;
  const origin = await getSiteOrigin();

  return <>
  <main className={styles.page} id="top">
    <JsonLd
      data={[
        travelAgencyJsonLd(content, origin),
        consultantJsonLd(content, origin),
        {
          "@context": "https://schema.org",
          "@type": "AboutPage",
          url: `${origin}/about`,
          name: `關於 Yui｜${content.brandName}`,
          inLanguage: "zh-Hant",
          mainEntity: { "@id": consultantId(origin) },
          about: [{ "@id": consultantId(origin) }, { "@id": agencyId(origin) }],
        },
      ]}
    />
    <a className={styles.skipLink} href="#tabiyoi">跳至頁面內容</a>
    <SiteHeader brandName={content.brandName} lineUrl={content.lineUrl} active="/about" />

    <section className={styles.hero} aria-labelledby="about-title">
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>ABOUT YUI ・ 關於 Yui</p>
        <h1 id="about-title">好旅，<br />從遇見<br /><em>對的人</em>開始。</h1>
        <p className={styles.heroDescription}>我是 Yui。走過 20 多個國家、在日本生活了五年，<br />想把這些路上的經驗，變成你下一趟剛剛好的旅行。</p>
        <ul className={styles.heroFacts} aria-label="關於 Yui">
          <li><strong>20<sup>+</sup></strong><span>走訪國家</span></li>
          <li><strong>5<small>年</small></strong><span>日本生活</span></li>
          <li><strong>4<small>項</small></strong><span>專屬服務</span></li>
        </ul>
        <a className={styles.underlinedLink} href="#yui-services">Yui 能為你做什麼 <span aria-hidden="true">↓</span></a>
      </div>
      <FilmDeck rows={filmRows} />
    </section>

    <nav className={styles.sectionNav} aria-label="關於 Yui 頁面章節">
      <a href="#tabiyoi">01 <span>Tabiyoi</span></a>
      <a href="#yui-services">02 <span>Yui 的服務</span></a>
      <a href="#traveler-stories">03 <span>旅人好評</span></a>
    </nav>

    <section className={`${styles.section} ${styles.story}`} id="tabiyoi" aria-labelledby="story-title">
      <div className={styles.nameMark}>
        <p className={styles.eyebrow}>WHAT TABIYOI MEANS</p>
        <p className={styles.kana} aria-hidden="true"><span>旅<small>Tabi</small></span><span>よい<small>Yoi</small></span></p>
      </div>
      <div className={styles.storyBody}>
        <h2 id="story-title">Tabiyoi（旅よい），<br />代表著美好的旅行。</h2>
        <p className={styles.lead}>結合日文「旅（Tabi）」與「よい（Yoi）」，<br />好旅，從遇見對的人開始。</p>
        <p>對我們而言，旅行不只是前往一個目的地，而是找到真正適合自己的旅行方式，讓每一次出發，都成為值得收藏的回憶。</p>
      </div>
    </section>

    <section className={styles.servicesSection} id="yui-services" aria-labelledby="services-title">
      <div className={styles.section}>
        <div className={styles.sectionHead}><div><p className={styles.eyebrow}>YUI&apos;S SERVICES</p><h2 id="services-title">Yui 的專屬服務，<br />我能為你做什麼？</h2></div><p>每一趟旅行，都由 Yui 親自聽你說、<br />親自幫你排，從第一句話到出發那天。</p></div>
        <div className={styles.serviceList}>
          {services.map((service, index) => <article className={`${styles.service} ${index % 2 ? styles.serviceFlip : ""}`} key={service.number}>
            <div className={`${styles.servicePhotos} ${service.photos.length > 1 ? styles.servicePhotosPair : ""}`}>
              {service.photos.map(photo => <figure key={photo.src}><TravelImage src={photo.src} alt={photo.alt} sizes={service.photos.length > 1 ? "(max-width: 760px) 50vw, 26vw" : "(max-width: 760px) 100vw, 52vw"} /></figure>)}
            </div>
            <div className={styles.serviceCopy}>
              <span className={styles.serviceNumber}>{service.number}</span>
              <p className={styles.eyebrow}>{service.english}</p>
              <h3>{service.title}</h3><p>{service.text}</p>
              <Link className={styles.underlinedLink} href={service.href}>{service.action} <span aria-hidden="true">↗</span></Link>
            </div>
          </article>)}
        </div>
      </div>
    </section>

    <section className={`${styles.section} ${styles.extras}`} aria-labelledby="extras-title">
      <figure className={styles.extrasPhoto}>
        <TravelImage src="/news/tokyo-nikki.jpg" alt="櫻花沿著東京的運河盛開" sizes="(max-width: 760px) 100vw, 45vw" />
      </figure>
      <div className={styles.extrasCopy}>
        <p className={styles.eyebrow}>MORE THAN AN ITINERARY</p>
        <h2 id="extras-title">東京民宿、當地包車，<br />也可以交給 Yui。</h2>
        <p>除了完整的旅遊行程規劃，Yui 也提供東京民宿住宿、當地包車接送等服務資源。無論是自由行、家庭旅遊，或想讓旅程更加輕鬆自在，都歡迎提出需求，讓每一段旅行安排更有彈性、更貼近你的期待。</p>
        <a className={styles.underlinedLink} href={tokyoNikkiUrl} target="_blank" rel="noopener">看東京民宿・包車 <span aria-hidden="true">↗</span></a>
      </div>
    </section>

    <section className={styles.promise} aria-label="Tabiyoi 的承諾">
      <p>Tabiyoi，希望帶給你的不只是一趟旅行，<br />而是一段安心、自在，又值得期待的美好旅程。</p>
      <p className={styles.promiseSign}>Your Journey, My Priority.<span>— Yui</span></p>
    </section>

    <section className={`${styles.section} ${styles.reviews}`} id="traveler-stories" aria-labelledby="reviews-title">
      <div className={styles.sectionHead}><div><p className={styles.eyebrow}>WORDS FROM OUR TRAVELERS</p><h2 id="reviews-title">旅行之後，<br />留下來的暖心回音。</h2></div><div className={styles.reviewIntro}><span className={styles.reviewTag}>Yui 的旅客回饋</span><p>從 Google Maps 精選提到 Yui 的旅客故事，<br />聽聽他們如何走過一段安心的旅程。</p></div></div>
      <article className={styles.featuredReview}>
        <div className={styles.featuredAside}><span className={styles.eyebrow}>A MEMORY TO KEEP</span><span className={styles.memoryMark} aria-hidden="true">好好<br />被照顧。</span><span>{featured.journey}</span></div>
        <div className={styles.featuredBody}>
          <div className={styles.reviewMeta}><span aria-label="5 顆星" className={styles.stars}>★★★★★</span><span>旅客回饋摘要</span></div>
          <h3>{featured.title}</h3><p>{featured.summary}</p><ReviewCredit review={featured} />
        </div>
      </article>
      <div className={styles.reviewGrid}>{reviews.map(review => <article className={styles.reviewCard} key={review.sourceUrl}>
        <div className={styles.reviewMeta}><span className={styles.stars} aria-label={`${review.rating} 顆星`}>★★★★★</span><span>{review.journey}</span></div>
        <h3>{review.title}</h3><p>{review.summary}</p><span className={styles.summaryLabel}>旅客回饋摘要</span><ReviewCredit review={review} />
      </article>)}</div>
      <div className={styles.reviewNote}><p>以上為精選五星評論的編輯摘要，非逐字引言，亦非全部評論。<br />來源：Google Maps「找到了旅行社股份有限公司」西湖據點。</p><a className={styles.underlinedLink} href={googleMapsPlaceUrl} target="_blank" rel="noopener noreferrer">前往 Google Maps <span aria-hidden="true">↗</span></a></div>
    </section>

    <section className={styles.contact} aria-labelledby="contact-title">
      <p className={styles.eyebrow}>YOUR NEXT CHAPTER</p><h2 id="contact-title">下一段旅程，<br />讓 Yui 陪你一起出發。</h2><p>一個想去的地方、一段期待的假期。<br />還沒想好也沒關係，先跟 Yui 聊聊。</p>
      <div className={styles.contactActions}><a href={content.lineUrl} target="_blank" rel="noopener noreferrer">LINE 找 Yui <span aria-hidden="true">↗</span></a><Link href="/contact">請顧問幫我規劃 <span aria-hidden="true">→</span></Link></div>
    </section>

    <LineFloatingButton lineUrl={content.lineUrl} />
  </main>
  <SiteFooter content={content} />
  </>;
}
