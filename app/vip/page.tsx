import type { Metadata } from "next";
import Link from "next/link";
import { getSiteContent } from "@/lib/site-content";
import { getSiteOrigin } from "@/lib/site-url";
import { socialMetadata } from "@/lib/page-metadata";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/structured-data";
import { fastestTrips, vipCorporateNote, vipFaqs, vipPointsPerTrip, vipSteps, vipTiers } from "@/lib/vip";
import { JsonLd } from "@/app/components/JsonLd";
import { SiteHeader } from "@/app/components/SiteHeader";
import { SiteFooter } from "@/app/components/SiteFooter";
import { LineFloatingButton } from "@/app/components/LineFloatingButton";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const description =
  "找到了 VIP 集點：參加指定行程，每團每人約可累積 1,000～10,000 點。滿 25,000 點升等個人卡，之後本人參團可帶親友一起享團費優惠；點數越多，等級越高，折扣越多。";

export const metadata: Metadata = {
  title: "VIP 集點｜愈玩愈划算，點數變現金",
  description,
  alternates: { canonical: "/vip" },
  ...socialMetadata({ title: "找到了 VIP 集點｜愈玩愈划算，點數變現金", description, path: "/vip" }),
};

const points = (value: number) => value.toLocaleString("en-US");
const topTier = vipTiers[vipTiers.length - 1];

export default async function VipPage() {
  const [content, origin] = await Promise.all([getSiteContent(), getSiteOrigin()]);

  return <>
  <main className={styles.page}>
    <a className={styles.skipLink} href="#vip-how">跳至頁面內容</a>
    <SiteHeader brandName={content.brandName} lineUrl={content.lineUrl} active="/vip" />
    <JsonLd
      data={[
        faqJsonLd(vipFaqs, `${origin}/vip`),
        breadcrumbJsonLd([{ name: "首頁", path: "/" }, { name: "VIP 集點", path: "/vip" }], origin),
      ]}
    />

    <section className={styles.hero} aria-labelledby="vip-title">
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>FOUND VIP</p>
        <p className={styles.heroLabel}>找到了 VIP 集點</p>
        <h1 id="vip-title">愈玩愈划算，<br /><em>點數變現金。</em></h1>
        <p className={styles.heroDescription}>
          參加指定行程，每團每人約可累積 {points(vipPointsPerTrip.min)}～{points(vipPointsPerTrip.max)} 點。
          點數達到 {points(vipTiers[0].points)} 點就能升等個人卡，以後本人參團，還可以帶 1 位親友一起享優惠。
        </p>
        <div className={styles.heroActions}>
          <a className={styles.primaryLink} href={content.lineUrl} target="_blank" rel="noopener noreferrer">問 Yui 醬我的點數 <span aria-hidden="true">↗</span></a>
          <a className={styles.underlinedLink} href="#vip-tiers">看四種會員卡 <span aria-hidden="true">↓</span></a>
        </div>
      </div>
      <dl className={styles.heroFacts}>
        <div><dt>每團每人可累積</dt><dd>{points(vipPointsPerTrip.min)}<span>～</span>{points(vipPointsPerTrip.max)}<small>點</small></dd></div>
        <div><dt>升等個人卡</dt><dd>{points(vipTiers[0].points)}<small>點</small></dd></div>
        <div><dt>會員卡別</dt><dd>{vipTiers.length}<small>種</small></dd></div>
        <p>一卡在手，全家都能用，並享終生團費折扣資格。</p>
      </dl>
    </section>

    <section className={`${styles.section} ${styles.how}`} id="vip-how" aria-labelledby="how-title">
      <div className={styles.sectionHead}>
        <div><p className={styles.eyebrow}>HOW IT WORKS</p><h2 id="how-title">怎麼集點？</h2></div>
        <p>不用另外申請，跟著我們出發就開始累積。<br />點數越多，會員等級越高，團費折扣也越多。</p>
      </div>
      <ol className={styles.steps}>
        {vipSteps.map((step) => <li key={step.number}>
          <span className={styles.stepNumber}>{step.number}</span>
          <p className={styles.eyebrow}>{step.english}</p>
          <h3>{step.title}</h3>
          <p>{step.text}</p>
        </li>)}
      </ol>
    </section>

    <section className={styles.tiersSection} id="vip-tiers" aria-labelledby="tiers-title">
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <div><p className={styles.eyebrow}>MEMBER PRIVILEGES</p><h2 id="tiers-title">VIP 會員禮遇</h2></div>
          <p>一卡在手，全家都能用。<br />累積的點數越多，能一起享優惠的親友也越多。</p>
        </div>

        {/* 點數門檻的刻度：四張卡在 0 到 150,000 點之間的位置。 */}
        <div className={styles.scale} aria-hidden="true">
          <span className={styles.scaleLine} />
          {vipTiers.map((tier) => <span key={tier.id} className={styles.scaleMark} style={{ left: `${(tier.points / topTier.points) * 100}%` }}>
            <b />{points(tier.points)}
          </span>)}
        </div>

        <div className={styles.tierGrid}>
          {vipTiers.map((tier) => <article key={tier.id} className={`${styles.tier}${tier.mustTravel ? "" : ` ${styles.tierFeatured}`}`}>
            <p className={styles.eyebrow}>{tier.english}</p>
            <h3>{tier.name}</h3>
            <p className={styles.tierPoints}>{points(tier.points)}<small>點</small></p>
            <dl>
              <div><dt>優惠人數</dt><dd>{tier.guests}</dd></div>
              <div><dt>本人參團</dt><dd>{tier.mustTravel ? "本人需要參團" : "本人不需參團"}</dd></div>
              <div><dt>最快升等</dt><dd>約 {fastestTrips(tier.points)} 團</dd></div>
            </dl>
            <p className={styles.tierText}>{tier.description}</p>
          </article>)}
        </div>
        <ul className={styles.notes}>
          <li>個人卡、親友卡、無限卡：VIP 本人皆需要參團。</li>
          <li>{vipCorporateNote}</li>
          <li>「最快升等」以每團 {points(vipPointsPerTrip.max)} 點（上限）估算；每團實際點數依行程而定。</li>
        </ul>
      </div>
    </section>

    <section className={`${styles.section} ${styles.faq}`} aria-labelledby="faq-title">
      <div><p className={styles.eyebrow}>FAQ</p><h2 id="faq-title">集點常見問題</h2></div>
      <div className={styles.faqList}>
        {vipFaqs.map((faq) => <details key={faq.question}>
          <summary>{faq.question}<span aria-hidden="true" /></summary>
          <p>{faq.answer}</p>
        </details>)}
      </div>
    </section>

    <section className={styles.contact} aria-labelledby="vip-contact-title">
      <p className={styles.eyebrow}>ASK YUI</p>
      <h2 id="vip-contact-title">離下一張卡，<br />還差幾點？</h2>
      <p>想知道自己現在有幾點，或是哪個行程可以集點，<br />直接找 Yui 醬就好。</p>
      <div className={styles.contactActions}>
        <a href={content.lineUrl} target="_blank" rel="noopener noreferrer">LINE 問 Yui 醬 <span aria-hidden="true">↗</span></a>
        <Link href="/dates">看出發團期 <span aria-hidden="true">↗</span></Link>
      </div>
    </section>

    <LineFloatingButton lineUrl={content.lineUrl} />
  </main>
  <SiteFooter content={content} />
  </>;
}
