import Link from "next/link";
import { titlePhrases } from "@/lib/title-phrases";
import { promotionEndLabel, type Promotion } from "@/lib/promotions";
import { TravelImage } from "./TravelImage";

// 首頁行程列表上方的「現正優惠」：活動期間才出現，內容與彈窗共用 lib/promotions.ts。
export function PromoCard({ promotion }: { promotion: Promotion }) {
  return (
    <aside className="fh-offer" aria-labelledby="offer-title" data-rv>
      <Link className="fh-offer-media" href={promotion.href} tabIndex={-1} aria-hidden="true">
        <TravelImage src={promotion.image} alt="" sizes="(max-width: 760px) 100vw, 400px" />
      </Link>
      <div className="fh-offer-copy">
        <p className="fh-offer-kicker">
          {promotion.kicker}<span aria-hidden="true">・</span>至 {promotionEndLabel(promotion)}
        </p>
        <h3 id="offer-title">
          <Link href={promotion.href}>
            {titlePhrases(promotion.title).map((phrase) => <span className="fh-phrase" key={phrase}>{phrase}</span>)}
          </Link>
        </h3>
        <p className="fh-offer-text">{promotion.text}</p>
        <div className="fh-offer-foot">
          <Link className="fh-link" href={promotion.href} tabIndex={-1} aria-hidden="true">
            {promotion.cta}
            <svg className="fh-arrow fh-arrow-right" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
          </Link>
          {promotion.warning ? <small>{promotion.warning}</small> : null}
        </div>
      </div>
    </aside>
  );
}
