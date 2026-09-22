import type { Metadata } from "next";
import Link from "next/link";
import { getSiteContent } from "@/lib/site-content";
import { googleMapsPlaceUrl, travelerReviews } from "@/lib/traveler-reviews";
import { MobileNav } from "@/app/components/MobileNav";
import { TravelImage } from "@/app/components/TravelImage";
import { LineFloatingButton } from "@/app/components/LineFloatingButton";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "關於我們｜讓每一份期待，被好好照顧",
  description: "認識找到了旅行社的服務理念，閱讀旅客分享的 Yui 服務回饋。從家庭旅行、精選跟團到企業旅遊，一起找到適合你的旅行方式。",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "關於我們｜找到了旅行社",
    description: "風景值得期待，旅程值得被好好照顧。認識我們，也聽聽旅人的故事。",
    url: "/about",
  },
};

const navLinks = [
  { href: "/", label: "首頁" },
  { href: "/#journeys", label: "精選行程" },
  { href: "/dates", label: "出發團期" },
  { href: "/about", label: "關於我們" },
];

const services = [
  { number: "01", english: "CURATED JOURNEYS", title: "精選跟團旅行", text: "從想去的地方開始，陪你比較航班、住宿與行程節奏，找到適合這次假期的選擇。", href: "/#journeys", action: "探索精選行程" },
  { number: "02", english: "YOUR OWN PACE", title: "親友自組・客製旅遊", text: "帶爸媽出國、和朋友相聚，或規劃一場家庭旅行。把同行者的喜好與需求，交給顧問一起整理。", href: "/find-trip", action: "整理我的旅行想法" },
  { number: "03", english: "BETTER TOGETHER", title: "企業・員工旅遊", text: "從團隊人數、預算到出發日期，協助釐清每一項安排，讓共同出遊成為值得珍藏的團隊回憶。", href: "/contact", action: "洽詢團體規劃" },
];

function ReviewCredit({ review }: { review: (typeof travelerReviews)[number] }) {
  return <div className={styles.reviewCredit}>
    <div><strong>{review.author}</strong><span>Google Maps 評論者</span></div>
    <a href={review.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`閱讀 ${review.author} 的 Google 評論原文（另開分頁）`}>閱讀原文 <span aria-hidden="true">↗</span></a>
  </div>;
}

export default async function AboutPage() {
  const content = await getSiteContent();
  const [featured, ...reviews] = travelerReviews;

  return <main className={styles.page} id="top">
    <a className={styles.skipLink} href="#our-story">跳至頁面內容</a>
    <header className={styles.header}>
      <Link className="brand" href="/" aria-label={`${content.brandName}首頁`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="brand-logo" src="/brand/logo-mark.png" alt="" />
        <span>{content.brandName}</span>
      </Link>
      <nav className={styles.desktopNav} aria-label="主要導覽">
        {navLinks.map(link => <Link key={link.href} href={link.href} aria-current={link.href === "/about" ? "page" : undefined}>{link.label}</Link>)}
      </nav>
      <div className={styles.headerActions}>
        <Link className={styles.headerContact} href="/contact">聊聊你的旅行 <span aria-hidden="true">↗</span></Link>
        <MobileNav links={navLinks} lineUrl={content.lineUrl} brandName={content.brandName} />
      </div>
    </header>

    <section className={styles.hero} aria-labelledby="about-title">
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>ABOUT FOUND TRAVEL</p>
        <p className={styles.heroLabel}>關於我們</p>
        <h1 id="about-title">風景值得期待，<br />旅程值得<br /><em>被好好照顧。</em></h1>
        <p className={styles.heroDescription}>找到的不只是下一個目的地，<br />而是適合你、也讓你安心的旅行方式。</p>
        <a className={styles.underlinedLink} href="#traveler-stories">聽聽旅人的故事 <span aria-hidden="true">↓</span></a>
        <span className={styles.heroSignature} aria-hidden="true">A little further. A little closer.</span>
      </div>
      <figure className={styles.heroPhoto}>
        <TravelImage src="/trips/bali.jpg" alt="峇里島湖畔寺廟與山霧，在水面留下寧靜倒影" priority sizes="(max-width: 760px) 100vw, 52vw" />
        <figcaption><span>THE ART OF TRAVEL</span><span>把期待，慢慢走成回憶。</span></figcaption>
      </figure>
    </section>

    <nav className={styles.sectionNav} aria-label="關於我們頁面章節">
      <a href="#our-story">01 <span>我們相信</span></a>
      <a href="#our-services">02 <span>旅行服務</span></a>
      <a href="#traveler-stories">03 <span>旅人好評</span></a>
    </nav>

    <section className={`${styles.section} ${styles.story}`} id="our-story" aria-labelledby="story-title">
      <div>
        <p className={styles.eyebrow}>OUR PHILOSOPHY</p>
        <h2 id="story-title">好旅行，<br />從好好聽你說開始。</h2>
      </div>
      <div className={styles.storyBody}>
        <p className={styles.lead}>有人想看遠方的風景，<br />有人想陪最重要的人，多走一段路。</p>
        <p>對找到了旅行社而言，每一趟出發，都有不同的期待。我們相信，規劃旅行的第一步，是了解你和誰同行、喜歡什麼步調，以及那些看似微小，卻讓你在意的事。</p>
        <p>從挑選行程、確認航班與住宿，到出發前的提醒，讓資訊清楚、讓溝通有溫度，把每一段期待，排成剛剛好的旅程。</p>
        <div className={styles.principles}>
          <div><span>01 / LISTEN</span><h3>先聽，再安排</h3><p>從同行者與真正的需求出發。</p></div>
          <div><span>02 / CLARITY</span><h3>把細節說清楚</h3><p>費用、行程與注意事項，逐一確認。</p></div>
          <div><span>03 / CARE</span><h3>讓溝通有溫度</h3><p>有疑問時，知道可以找誰聊聊。</p></div>
        </div>
      </div>
    </section>

    <section className={styles.servicesSection} id="our-services" aria-labelledby="services-title">
      <div className={styles.section}>
        <div className={styles.sectionHead}><div><p className={styles.eyebrow}>WAYS TO EXPLORE</p><h2 id="services-title">你的旅行，<br />可以有很多種樣子。</h2></div><p>不急著給你答案。<br />先一起找到，這次想怎麼出發。</p></div>
        <div className={styles.serviceGrid}>
          {services.map(service => <article className={styles.service} key={service.number}>
            <span className={styles.serviceNumber}>{service.number}</span>
            <p className={styles.eyebrow}>{service.english}</p>
            <h3>{service.title}</h3><p>{service.text}</p>
            <Link className={styles.underlinedLink} href={service.href}>{service.action} <span aria-hidden="true">↗</span></Link>
          </article>)}
        </div>
      </div>
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
      <p className={styles.eyebrow}>YOUR NEXT CHAPTER</p><h2 id="contact-title">下一段故事，<br />換我們陪你一起出發。</h2><p>一個想去的地方、一段期待的假期。<br />還沒想好也沒關係，從聊聊開始。</p>
      <div className={styles.contactActions}><a href={content.lineUrl} target="_blank" rel="noopener noreferrer">LINE 聯絡顧問 <span aria-hidden="true">↗</span></a><Link href="/contact">填寫聯絡表單 <span aria-hidden="true">→</span></Link></div>
    </section>

    <footer className={styles.footer}>
      <div><Link className="brand" href="/">{content.brandName}</Link><p>好旅行，被好好照顧。</p></div>
      <div className={styles.companyDetails}><strong>{content.companyName}</strong><span>{content.businessLicense}・{content.qualityLicense}</span><span>統一編號 {content.taxId} │ 負責人 {content.representative}</span><span>{content.address}</span></div>
      <nav aria-label="頁尾導覽"><Link href="/">回首頁</Link><Link href="/dates">出發團期</Link><Link href="/contact">聯絡我們</Link></nav>
    </footer>
    <LineFloatingButton lineUrl={content.lineUrl} />
  </main>;
}
