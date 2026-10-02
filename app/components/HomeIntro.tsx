"use client";

import { useEffect, useState } from "react";

// 同一個分頁只播放一次：整頁重新載入由 <head> 的行內腳本依 sessionStorage 判斷
// （見 layout.tsx），站內換頁回到首頁則由這個模組變數判斷，兩者都不會重播序幕。
let played = false;

export function HomeIntro() {
  const [show] = useState(() => !played);

  useEffect(() => {
    if (!show) {
      document.documentElement.dataset.intro ||= "played";
      return;
    }
    played = true;
    try {
      sessionStorage.setItem("found-intro", "1");
    } catch {}
    // 序幕結束後，首屏動畫的延遲歸零（站內再回首頁時不再等待）。
    const timer = window.setTimeout(() => {
      document.documentElement.dataset.intro ||= "played";
    }, 3600);
    return () => window.clearTimeout(timer);
  }, [show]);

  if (!show) return null;
  return (
    <div className="fh-intro" aria-hidden="true">
      <div className="fh-intro-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="fh-intro-mark" src="/brand/logo-mark.png" alt="" width="225" height="177" />
        <span className="fh-intro-name">FOUND TRAVEL</span>
        <span className="fh-intro-line"><i /></span>
      </div>
    </div>
  );
}
