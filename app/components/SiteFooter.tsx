import Link from "next/link";
import type { SiteContent } from "@/lib/site-content";
import { telephoneHref } from "@/lib/structured-data";
import { tripDestinations } from "@/lib/destinations";
import { SocialLinks } from "./SocialLinks";

// 全站共用頁尾：首頁與內頁使用同一套公司資訊與字標，錨點在首頁走頁內捲動。
export function SiteFooter({
  content,
  home = false,
}: {
  content: Pick<
    SiteContent,
    "brandName" | "companyName" | "businessLicense" | "qualityLicense" | "taxId" | "representative" | "address" | "telephone" | "email" | "lineUrl" | "trips"
  >;
  home?: boolean;
}) {
  // 每一頁的頁尾都連到各個目的地頁，目的地頁再連到底下的行程。
  const destinations = tripDestinations(content.trips);
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
          <SocialLinks lineUrl={content.lineUrl} labels className="fh-footer-social" />
        </div>
        <div className="fh-footer-company">
          <strong>{content.companyName}</strong>
          <span>{content.businessLicense}</span>
          <span>{content.qualityLicense}</span>
          <span>
            統一編號 {content.taxId} │ 負責人 {content.representative}
          </span>
          <span>地址：{content.address}</span>
          {content.telephone ? (
            <span>電話：<a href={telephoneHref(content.telephone)}>{content.telephone}</a></span>
          ) : null}
          {content.email ? (
            <span>Email：<a href={`mailto:${content.email}`}>{content.email}</a></span>
          ) : null}
        </div>
        <nav className="fh-footer-links" aria-label="頁尾導覽">
          <Link href={home ? "#journeys" : "/#journeys"}>精選行程</Link>
          <Link href="/dates">出發團期</Link>
          <Link href="/find-trip">幫我找旅行</Link>
          <Link href="/news">最新消息</Link>
          <Link href="/about">關於我們</Link>
          <Link href="/contact">聯絡表單</Link>
          <a href="/studio">內容管理</a>
        </nav>
      </div>
      {destinations.length > 0 ? (
        <nav className="fh-wrap fh-footer-destinations" aria-label="旅遊目的地">
          <Link href="/destinations"><strong>旅遊目的地</strong></Link>
          {destinations.map((destination) => (
            <Link key={destination.slug} href={destination.path}>{destination.name}</Link>
          ))}
        </nav>
      ) : null}
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
