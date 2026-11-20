"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { titlePhrases } from "@/lib/title-phrases";
import { promotionEndLabel, type Promotion } from "@/lib/promotions";
import { TravelImage } from "./TravelImage";

// 首頁活動彈窗：序幕播完才出現；關掉（或點進活動）後 7 天內同一個活動不再跳出。
const quietDays = 7;
const storageKey = (id: string) => `found-promo:${id}`;

function recentlySeen(id: string) {
  try {
    const at = Number(localStorage.getItem(storageKey(id)));
    return at > 0 && Date.now() - at < quietDays * 86_400_000;
  } catch {
    return false;
  }
}

function rememberSeen(id: string) {
  try {
    localStorage.setItem(storageKey(id), String(Date.now()));
  } catch {}
}

export function PromoPopup({ promotion }: { promotion: Promotion }) {
  const dialog = useRef<HTMLDialogElement>(null);
  // 看過的人不必下載活動圖：確定要跳出才把彈窗放進頁面。
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (recentlySeen(promotion.id)) return;
    // 第一次進站有序幕；同一分頁已播過就早一點出現。先放進頁面讓圖片開始下載，再打開。
    const introDone = Boolean(document.documentElement.dataset.intro);
    const mountTimer = window.setTimeout(() => setMounted(true), introDone ? 0 : 800);
    const openTimer = window.setTimeout(() => {
      const node = dialog.current;
      // 手機選單或其他視窗開著時不打擾。
      if (!node || node.open || document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')) return;
      node.showModal();
    }, introDone ? 1500 : 3500);
    return () => {
      window.clearTimeout(mountTimer);
      window.clearTimeout(openTimer);
    };
  }, [promotion.id]);

  if (!mounted) return null;

  // 按鈕與點背景：當下就記住；Esc 由下面的 onClose 記住。
  const close = () => {
    rememberSeen(promotion.id);
    dialog.current?.close();
  };

  return (
    <dialog
      ref={dialog}
      className="fh-promo"
      aria-labelledby="promo-title"
      aria-describedby="promo-text"
      onClose={() => rememberSeen(promotion.id)}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="fh-promo-box">
        <button type="button" className="fh-promo-close" onClick={close} aria-label="關閉優惠訊息">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        <Link className="fh-promo-media" href={promotion.href} onClick={close} tabIndex={-1} aria-hidden="true">
          <TravelImage src={promotion.image} alt="" priority sizes="(max-width: 760px) 100vw, 720px" />
        </Link>
        <div className="fh-promo-copy">
          <p className="fh-promo-kicker">
            {promotion.kicker}<span aria-hidden="true">・</span>至 {promotionEndLabel(promotion)}
          </p>
          <h2 id="promo-title">
            {titlePhrases(promotion.title).map((phrase) => <span className="fh-phrase" key={phrase}>{phrase}</span>)}
          </h2>
          <p id="promo-text">{promotion.text}</p>
          <div className="fh-promo-actions">
            <Link className="fh-btn" href={promotion.href} onClick={close}>
              {promotion.cta}
              <svg className="fh-arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
            </Link>
            <button type="button" className="fh-link" onClick={close}>下次再說</button>
          </div>
          {promotion.warning ? <small className="fh-promo-warning">{promotion.warning}</small> : null}
        </div>
      </div>
    </dialog>
  );
}
