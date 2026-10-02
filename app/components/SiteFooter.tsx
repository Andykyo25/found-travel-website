import Link from "next/link";
import type { SiteContent } from "@/lib/site-content";

// 全站共用頁尾：首頁與內頁使用同一套公司資訊與字標，錨點在首頁走頁內捲動。
export function SiteFooter({
  content,
  home = false,
}: {
  content: Pick<
    SiteContent,
    "brandName" | "companyName" | "businessLicense" | "qualityLicense" | "taxId" | "representative" | "address"
  >;
  home?: boolean;
}) {
  return (
    <footer className="fh-footer" role="contentinfo">
      <div className="fh-wrap fh-footer-grid">
        <div className="fh-footer-identity">
          <Link className="brand footer-brand" href={home ? "#top" : "/"}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="brand-logo" src="/brand/logo-mark.png" alt="" />
            <span>{content.brandName}</span>
          </Link>
          <p>內容與報價以業務顧問最終確認為準</p>
        </div>
        <div className="fh-footer-company">
          <strong>{content.companyName}</strong>
          <span>{content.businessLicense}</span>
          <span>{content.qualityLicense}</span>
          <span>
            統一編號 {content.taxId} │ 負責人 {content.representative}
          </span>
          <span>地址：{content.address}</span>
        </div>
        <nav className="fh-footer-links" aria-label="頁尾導覽">
          <Link href={home ? "#journeys" : "/#journeys"}>精選行程</Link>
          <Link href="/dates">出發團期</Link>
          <Link href="/find-trip">幫我找旅行</Link>
          <Link href="/about">關於我們</Link>
          <Link href="/contact">聯絡表單</Link>
          <a href="/studio">內容管理</a>
        </nav>
      </div>
      <div className="fh-wordmark" aria-hidden="true">FOUND</div>
      <div className="fh-wrap fh-colophon">
        <span>FOUND TRAVEL — 好旅行，被好好照顧。</span>
        <Link href="#top">
          回到頁首
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6" /></svg>
        </Link>
      </div>
    </footer>
  );
}
