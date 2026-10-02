"use client";
import Link from "next/link";
import { SplitText } from "./components/SplitText";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="fh-404">
      <header className="fh-404-bar">
        <Link className="brand" href="/">找到了旅行社</Link>
      </header>
      <div className="fh-404-stage" role="alert">
        <span className="fh-marks" aria-hidden="true"><b /><b /><b /><b /></span>
        <p className="fh-eyebrow fh-eyebrow-light">SOMETHING WENT WRONG</p>
        <SplitText as="h1" text="網站暫時無法載入" intro start={200} />
        <p>目前無法確認最新行程資料，請稍後重新嘗試。</p>
        <div className="fh-404-actions">
          <button className="fh-btn fh-btn-light" type="button" onClick={reset}>重新載入</button>
          <Link className="fh-btn fh-btn-ghost" href="/">回到首頁</Link>
        </div>
      </div>
    </main>
  );
}
