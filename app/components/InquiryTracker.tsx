"use client";

import { useEffect } from "react";
import { lineMessageUrl, recordInquiry } from "@/lib/inquiry-events";

// 全站一個點擊監聽：
// 1. 客人按了 LINE 官方帳號的按鈕，記一筆「哪一頁」（LINE 社群的邀請連結不算）。
// 2. 按鈕上帶了 data-line-id / data-line-message 時，手機改開「預先填好訊息」的聊天畫面；
//    電腦版 LINE 不支援這種連結，維持原本的加好友頁。
const isPhone = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

function isOfficialAccountLink(href: string) {
  try {
    const url = new URL(href);
    if (url.hostname === "lin.ee") return true;
    return url.hostname === "line.me" && /^\/(R\/)?(ti\/p|oaMessage)\//.test(url.pathname);
  } catch {
    return false;
  }
}

export function InquiryTracker() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement) || !isOfficialAccountLink(anchor.href)) return;
      if (window.location.pathname.startsWith("/studio")) return;
      const { lineId, lineMessage } = anchor.dataset;
      if (lineId && lineMessage && isPhone()) anchor.href = lineMessageUrl(lineId, lineMessage);
      recordInquiry("line");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
