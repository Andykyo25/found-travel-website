import type { Metadata } from "next";
import Link from "next/link";
import { LineFloatingButton } from "@/app/components/LineFloatingButton";
import { SiteFooter } from "@/app/components/SiteFooter";
import { SiteHeader } from "@/app/components/SiteHeader";
import { SplitText } from "@/app/components/SplitText";
import { TravelImage } from "@/app/components/TravelImage";
import { newsDateLabel, publishedNews } from "@/lib/news";
import { titlePhrases } from "@/lib/title-phrases";
import { getSiteContent } from "@/lib/site-content";
import { socialMetadata } from "@/lib/page-metadata";
import styles from "./news.module.css";
import { CommunityInvite } from "@/app/components/CommunityInvite";

export const dynamic = "force-dynamic";

const description = "出國前該知道的新規定、旅遊須知與找到了旅行社的最新動態，都整理在這裡。";

export const metadata: Metadata = {
  title: "最新消息",
  description,
  alternates: { canonical: "/news" },
  ...socialMetadata({ title: "最新消息", description, path: "/news" }),
};

export default async function NewsPage() {
  const content = await getSiteContent();
  const articles = publishedNews();

  return (
    <>
    <main className="public-page">
      <a className="skip-link" href="#news-list">跳至消息列表</a>
      <SiteHeader brandName={content.brandName} lineUrl={content.lineUrl} active="/news" />
      <nav className="page-breadcrumb" aria-label="麵包屑導覽"><Link href="/">首頁</Link><span aria-hidden="true">/</span><span aria-current="page">最新消息</span></nav>

      <section className="board-head">
        <p className="eyebrow">
          <span />
          LATEST NEWS
        </p>
        <SplitText as="h1" text="最新消息" />
        <p className="board-lede">出國前該知道的新規定與旅遊須知，我們整理好放在這裡。</p>
      </section>

      <section id="news-list" aria-label="消息列表">
        {/* 每一則都用大卡片呈現，新的在上；不再把舊消息縮成一行。 */}
        {articles.map((article, index) => (
          <article
            key={article.slug}
            className={`${styles.latest}${article.imagePoster ? ` ${styles.latestPoster}` : ""}${article.imageBanner ? ` ${styles.latestBanner}` : ""}`}
          >
            <Link className={styles.latestMedia} href={`/news/${article.slug}`} tabIndex={-1} aria-hidden="true">
              <TravelImage src={article.image} alt="" priority={index === 0} sizes="(max-width: 900px) 100vw, 54vw" />
              {article.imagePoster || article.imageBanner ? null : <span className="fh-marks" aria-hidden="true"><b /><b /><b /><b /></span>}
            </Link>
            <div className={styles.latestCopy}>
              <p className={styles.meta}><time dateTime={article.publishedAt}>{newsDateLabel(article.publishedAt)}</time><span>{article.category}</span></p>
              <h2>
                <Link href={`/news/${article.slug}`}>
                  {titlePhrases(article.title).map((phrase) => <span className="fh-phrase" key={phrase}>{phrase}</span>)}
                </Link>
              </h2>
              <p>{article.summary}</p>
              <Link className="fh-link" href={`/news/${article.slug}`} aria-hidden="true" tabIndex={-1}>閱讀全文 <span aria-hidden="true">→</span></Link>
            </div>
          </article>
        ))}
      </section>

      <CommunityInvite url={content.communityUrl} title="新規定、旅遊須知，社群同步推播" text="這裡的每一則消息都會同步發到社群，也有大家分享的當地實況。" />

      <LineFloatingButton lineUrl={content.lineUrl} />
    </main>
    <SiteFooter content={content} />
    </>
  );
}
