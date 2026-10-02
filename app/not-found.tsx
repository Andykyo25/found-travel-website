import Link from "next/link";
import { defaultSiteContent, getSiteContent } from "@/lib/site-content";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { SplitText } from "./components/SplitText";

// 「找到了」的反面：這一頁沒找到。用品牌的取景框語彙，讓迷路也有一點溫度。
export default async function NotFound() {
  const content = await getSiteContent().catch(() => defaultSiteContent);
  return (
    <>
      <main className="fh-404" id="top">
        <SiteHeader brandName={content.brandName} lineUrl={content.lineUrl} tone="dark" />
        <div className="fh-404-stage">
          <span className="fh-marks" aria-hidden="true"><b /><b /><b /><b /></span>
          <p className="fh-eyebrow fh-eyebrow-light">PAGE NOT FOUND · 404</p>
          <div className="fh-404-no" aria-hidden="true">404</div>
          <SplitText as="h1" text="這一頁，暫時找不到。" intro start={200} />
          <p>連結可能已變更，或目前沒有這個月份的團期。可以回到首頁，或看看其他出發日期。</p>
          <div className="fh-404-actions">
            <Link className="fh-btn fh-btn-light" href="/dates">查看出發團期 →</Link>
            <Link className="fh-btn fh-btn-ghost" href="/">回到首頁</Link>
          </div>
        </div>
      </main>
      <SiteFooter content={content} />
    </>
  );
}
