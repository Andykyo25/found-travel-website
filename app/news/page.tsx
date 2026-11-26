import type { Metadata } from "next";
import Link from "next/link";
import { LineFloatingButton } from "@/app/components/LineFloatingButton";
import { SiteFooter } from "@/app/components/SiteFooter";
import { SiteHeader } from "@/app/components/SiteHeader";
import { SplitText } from "@/app/components/SplitText";
import { TravelImage } from "@/app/components/TravelImage";
import { findNewsTopic, newsDateLabel, newsListPage, newsTopic, newsTopics, publishedNews } from "@/lib/news";
import { NewsCard } from "./NewsCard";
import { titlePhrases } from "@/lib/title-phrases";
import { getSiteContent } from "@/lib/site-content";
import { socialMetadata } from "@/lib/page-metadata";
import styles from "./news.module.css";
import { CommunityInvite } from "@/app/components/CommunityInvite";

export const dynamic = "force-dynamic";

const title = "最新消息：出國新規定、旅遊須知與限時優惠";
const description = "出國前該知道的新規定與旅遊須知（例如日本免稅新制怎麼退稅）、找到了旅行社的限時優惠、東京住宿包車介紹與網站使用教學，都整理在這裡，出發前先看一遍更安心。";

type SearchParams = { searchParams: Promise<{ topic?: string; page?: string }> };

/** 篩選與分頁網址（/news?topic=guides&page=2）。第一頁、全部分類就是 /news。 */
function newsHref(topic?: string, page = 1) {
  const query = new URLSearchParams();
  if (topic) query.set("topic", topic);
  if (page > 1) query.set("page", String(page));
  const text = query.toString();
  return text ? `/news?${text}` : "/news";
}

export async function generateMetadata({ searchParams }: SearchParams): Promise<Metadata> {
  const { topic, page } = await searchParams;
  // 分類與分頁只是同一批文章換個排法：都指回 /news，不另外收錄。
  const filtered = Boolean(findNewsTopic(topic)) || Number(page) > 1;
  return {
    title,
    description,
    alternates: { canonical: "/news" },
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
    ...socialMetadata({ title, description, path: "/news" }),
  };
}

export default async function NewsPage({ searchParams }: SearchParams) {
  const query = await searchParams;
  const content = await getSiteContent();
  const all = publishedNews();
  const topic = findNewsTopic(query.topic);
  const { items, page, pageCount } = newsListPage(all, { topic: topic?.slug, page: Number(query.page) || 1 });
  // 第一頁最新的一篇用大卡片，其餘縮成小卡，文章變多也不用一直往下滑。
  const [featured, ...rest] = page === 1 ? items : [undefined, ...items];
  const counts = new Map(newsTopics.map((item) => [item.slug, all.filter((article) => newsTopic(article) === item.slug).length]));

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

      <nav className={styles.topics} aria-label="消息分類">
        <Link href="/news" aria-current={topic ? undefined : "page"}>全部 <span>{all.length}</span></Link>
        {newsTopics.filter((item) => (counts.get(item.slug) ?? 0) > 0).map((item) => (
          <Link key={item.slug} href={newsHref(item.slug)} aria-current={topic?.slug === item.slug ? "page" : undefined}>
            {item.name} <span>{counts.get(item.slug)}</span>
          </Link>
        ))}
      </nav>

      <section id="news-list" aria-label={topic ? `${topic.name}消息列表` : "消息列表"}>
        {featured ? (
          <article
            className={`${styles.latest}${featured.imagePoster ? ` ${styles.latestPoster}` : ""}${featured.imageBanner ? ` ${styles.latestBanner}` : ""}`}
          >
            <Link className={styles.latestMedia} href={`/news/${featured.slug}`} tabIndex={-1} aria-hidden="true">
              <TravelImage src={featured.image} alt="" priority sizes="(max-width: 900px) 100vw, 54vw" />
              {featured.imagePoster || featured.imageBanner ? null : <span className="fh-marks" aria-hidden="true"><b /><b /><b /><b /></span>}
            </Link>
            <div className={styles.latestCopy}>
              <p className={styles.meta}><time dateTime={featured.publishedAt}>{newsDateLabel(featured.publishedAt)}</time><span>{featured.category}</span></p>
              <h2>
                <Link href={`/news/${featured.slug}`}>
                  {titlePhrases(featured.title).map((phrase) => <span className="fh-phrase" key={phrase}>{phrase}</span>)}
                </Link>
              </h2>
              <p>{featured.summary}</p>
              <Link className="fh-link" href={`/news/${featured.slug}`} aria-hidden="true" tabIndex={-1}>閱讀全文 <span aria-hidden="true">→</span></Link>
            </div>
          </article>
        ) : null}

        {rest.length > 0 ? (
          <div className={styles.cards}>
            {rest.map((article) => article ? <NewsCard key={article.slug} article={article} headingLevel="h2" /> : null)}
          </div>
        ) : null}

        {items.length === 0 ? <p className={styles.empty}>這個分類目前還沒有文章。</p> : null}

        {pageCount > 1 ? (
          <nav className={styles.pages} aria-label="分頁">
            {page > 1 ? <Link href={newsHref(topic?.slug, page - 1)} rel="prev">← 較新的文章</Link> : <span />}
            <ol>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
                <li key={number}>
                  <Link href={newsHref(topic?.slug, number)} aria-current={number === page ? "page" : undefined} aria-label={`第 ${number} 頁`}>{number}</Link>
                </li>
              ))}
            </ol>
            {page < pageCount ? <Link href={newsHref(topic?.slug, page + 1)} rel="next">較舊的文章 →</Link> : <span />}
          </nav>
        ) : null}
      </section>

      <CommunityInvite url={content.communityUrl} title="新規定、旅遊須知，社群同步推播" text="這裡的每一則消息都會同步發到社群，也有大家分享的當地實況。" />

      <LineFloatingButton lineUrl={content.lineUrl} />
    </main>
    <SiteFooter content={content} />
    </>
  );
}
