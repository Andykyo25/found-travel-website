import Link from "next/link";
import { TravelImage } from "@/app/components/TravelImage";
import { newsDateLabel, type NewsArticle } from "@/lib/news";
import styles from "./news.module.css";

/** 列表與延伸閱讀共用的小卡：手機上是一行縮圖加標題，桌機是三欄卡片。 */
export function NewsCard({ article, headingLevel = "h3" }: { article: NewsArticle; headingLevel?: "h2" | "h3" }) {
  const Heading = headingLevel;
  const fit = article.imagePoster || article.imageBanner ? ` ${styles.cardFit}` : "";
  return (
    <article className={styles.card}>
      <Link className={`${styles.cardMedia}${fit}`} href={`/news/${article.slug}`} tabIndex={-1} aria-hidden="true">
        <TravelImage src={article.image} alt="" sizes="(max-width: 760px) 112px, (max-width: 1100px) 45vw, 30vw" />
      </Link>
      <div className={styles.cardCopy}>
        <p className={styles.meta}>
          <time dateTime={article.publishedAt}>{newsDateLabel(article.publishedAt)}</time>
          <span>{article.category}</span>
        </p>
        <Heading>
          <Link href={`/news/${article.slug}`}>{article.title}</Link>
        </Heading>
        <p className={styles.cardSummary}>{article.summary}</p>
      </div>
    </article>
  );
}
