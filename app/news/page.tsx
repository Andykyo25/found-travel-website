import type { Metadata } from "next";
import Link from "next/link";
import { LineFloatingButton } from "@/app/components/LineFloatingButton";
import { SiteFooter } from "@/app/components/SiteFooter";
import { SiteHeader } from "@/app/components/SiteHeader";
import { SplitText } from "@/app/components/SplitText";
import { TravelImage } from "@/app/components/TravelImage";
import { newsDateLabel, publishedNews } from "@/lib/news";
import { getSiteContent } from "@/lib/site-content";
import styles from "./news.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "最新消息",
  description: "出國前該知道的新規定、旅遊須知與找到了旅行社的最新動態，都整理在這裡。",
  alternates: { canonical: "/news" },
};

export default async function NewsPage() {
  const content = await getSiteContent();
  const [latest, ...older] = publishedNews();

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
        <article className={styles.latest}>
          <Link className={styles.latestMedia} href={`/news/${latest.slug}`} tabIndex={-1} aria-hidden="true">
            <TravelImage src={latest.image} alt="" priority sizes="(max-width: 900px) 100vw, 54vw" />
            <span className="fh-marks" aria-hidden="true"><b /><b /><b /><b /></span>
          </Link>
          <div className={styles.latestCopy}>
            <p className={styles.meta}><time dateTime={latest.publishedAt}>{newsDateLabel(latest.publishedAt)}</time><span>{latest.category}</span></p>
            <h2><Link href={`/news/${latest.slug}`}>{latest.title}</Link></h2>
            <p>{latest.summary}</p>
            <Link className="fh-link" href={`/news/${latest.slug}`} aria-hidden="true" tabIndex={-1}>閱讀全文 <span aria-hidden="true">→</span></Link>
          </div>
        </article>

        {older.length > 0 ? (
          <ol className={styles.rows}>
            {older.map((article) => (
              <li key={article.slug}>
                <Link href={`/news/${article.slug}`}>
                  <time dateTime={article.publishedAt}>{newsDateLabel(article.publishedAt)}</time>
                  <span>{article.category}</span>
                  <strong>{article.title}</strong>
                  <i aria-hidden="true">→</i>
                </Link>
              </li>
            ))}
          </ol>
        ) : null}
      </section>

      <LineFloatingButton lineUrl={content.lineUrl} />
    </main>
    <SiteFooter content={content} />
    </>
  );
}
