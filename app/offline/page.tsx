import type { Metadata } from "next";
import Link from "next/link";
import { defaultSiteContent } from "@/lib/site-content";
import { SiteHeader } from "../components/SiteHeader";
import { OfflineRetry } from "./OfflineRetry";

// 沒有網路、又沒看過這一頁時，service worker（public/sw.js）會拿這頁出來。
// 安裝時就先存好，所以不能讀後台資料，只用預設內容。
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "目前沒有網路",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  const content = defaultSiteContent;
  return (
    <main className="fh-404" id="top">
      <SiteHeader brandName={content.brandName} lineUrl={content.lineUrl} tone="dark" />
      <div className="fh-404-stage">
        <span className="fh-marks" aria-hidden="true"><b /><b /><b /><b /></span>
        <p className="fh-eyebrow fh-eyebrow-light">OFFLINE</p>
        <h1>目前沒有網路。</h1>
        <p>這一頁還沒看過，所以沒有存在手機上。連上網路後再試一次；之前看過的行程，現在仍然可以打開。</p>
        <div className="fh-404-actions">
          <OfflineRetry />
          <Link className="fh-btn fh-btn-ghost" href="/">回到首頁</Link>
        </div>
      </div>
    </main>
  );
}
