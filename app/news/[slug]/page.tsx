import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LineFloatingButton } from "@/app/components/LineFloatingButton";
import { NewsBlocks, NewsExternalLink } from "@/app/components/NewsBlocks";
import { SiteFooter } from "@/app/components/SiteFooter";
import { SiteHeader } from "@/app/components/SiteHeader";
import { SplitText } from "@/app/components/SplitText";
import { TravelImage } from "@/app/components/TravelImage";
import { findNewsArticle, newsDateLabel } from "@/lib/news";
import { getSiteContent } from "@/lib/site-content";
import { getSiteOrigin } from "@/lib/site-url";
import styles from "../news.module.css";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const article = findNewsArticle((await params).slug);
  if (!article) return { title: "找不到這則消息" };
  const description = article.summary;
  return {
    title: article.title,
    description,
    alternates: { canonical: `/news/${article.slug}` },
    openGraph: {
      title: article.title,
      description,
      type: "article",
      locale: "zh_TW",
      url: `/news/${article.slug}`,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt ?? article.publishedAt,
      images: [{ url: article.image, alt: article.imageAlt }],
    },
    twitter: { card: "summary_large_image", title: article.title, description, images: [article.image] },
  };
}

export default async function NewsArticlePage({ params }: Params) {
  const article = findNewsArticle((await params).slug);
  if (!article) notFound();
  const [content, origin] = await Promise.all([getSiteContent(), getSiteOrigin()]);

  // 結構化資料：讓搜尋結果認得這是一則有發布日期的消息。
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.summary,
    image: [`${origin}${article.image}`],
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    url: `${origin}/news/${article.slug}`,
    author: article.author ? { "@type": "Person", name: article.author } : { "@type": "Organization", name: content.brandName },
    publisher: { "@type": "TravelAgency", name: content.companyName, logo: `${origin}/brand/logo.png` },
  };

  return (
    <>
    <main className="public-page">
      <a className="skip-link" href="#article-content">跳至文章內容</a>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd).replace(/</g, "\\u003c") }}
      />
      <SiteHeader brandName={content.brandName} lineUrl={content.lineUrl} active="/news" />
      <nav className="page-breadcrumb" aria-label="麵包屑導覽"><Link href="/news">最新消息</Link><span aria-hidden="true">/</span><span aria-current="page">{article.shortTitle}</span></nav>

      <div className={styles.hero}>
        <header className={styles.articleHead}>
          <p className="eyebrow">
            <span />
            {article.category}
          </p>
          <SplitText as="h1" text={article.title} />
          <p className={styles.lede}>{article.summary}</p>
          <p className={styles.meta}>
            <time dateTime={article.publishedAt}>{newsDateLabel(article.publishedAt)}</time>
            {article.updatedAt ? <span>更新於 {newsDateLabel(article.updatedAt)}</span> : null}
            {article.author ? <span>整理：{article.author}</span> : null}
          </p>
        </header>

        <figure className={styles.cover}>
          <TravelImage src={article.image} alt={article.imageAlt} priority sizes="(max-width: 900px) 100vw, 46vw" />
          <span className="fh-marks" aria-hidden="true"><b /><b /><b /><b /></span>
        </figure>
      </div>

      <div className={styles.articleBody}>
        <nav className={styles.toc} aria-label="本文章節">
          <p>本文章節</p>
          <ol>
            {article.blocks.map((block) => <li key={block.id}><a href={`#${block.id}`}>{block.title}</a></li>)}
          </ol>
        </nav>

        <div className={styles.articleMain} id="article-content">
          <NewsBlocks blocks={article.blocks} />

          {article.video ? (
            <aside className={styles.video} aria-label="影片">
              <div>
                <h2>{article.video.title}</h2>
                <p>{article.video.text}</p>
              </div>
              <NewsExternalLink link={article.video.link} />
            </aside>
          ) : null}

          {article.sources.length > 0 ? (
            <section className={styles.sources} aria-labelledby="sources-title">
              <h2 id="sources-title">資料來源</h2>
              {article.disclaimer ? <p>{article.disclaimer}</p> : null}
              <ul>
                {article.sources.map((source) => (
                  <li key={source.href}><a href={source.href} target="_blank" rel="noopener noreferrer">{source.label} <span aria-hidden="true">↗</span></a></li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>

      <section className="board-cta">
        <div>
          <h2>{article.closing?.title ?? "有問題，問顧問最快。"}</h2>
          <p>{article.closing?.text ?? "想確認行程或出發前的準備，歡迎直接與我們聯繫。"}</p>
        </div>
        <div className="board-cta-actions">
          <a className="button" href={content.lineUrl} target="_blank" rel="noreferrer">
            LINE 聯絡顧問 <span aria-hidden="true">↗</span>
          </a>
          <Link className="button button-secondary" href="/dates">
            查看出發團期 <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <LineFloatingButton lineUrl={content.lineUrl} />
    </main>
    <SiteFooter content={content} />
    </>
  );
}
