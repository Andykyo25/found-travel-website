"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

export type NavLink = { href: string; label: string };

// 首頁錨點用 <a>，跨頁連結用 <Link>，兩者共用同一份選單資料。
function NavItem({
  link,
  onNavigate,
}: {
  link: NavLink;
  onNavigate: () => void;
}) {
  if (link.href.startsWith("#")) {
    return (
      <a href={link.href} onClick={onNavigate}>
        {link.label}
      </a>
    );
  }
  return (
    <Link href={link.href} onClick={onNavigate}>
      {link.label}
    </Link>
  );
}

export function MobileNav({
  links,
  lineUrl,
  brandName,
}: {
  links: NavLink[];
  lineUrl: string;
  brandName: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // 選單開啟時鎖住背景捲動，關閉時還原原本的設定。
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
  }, [open]);

  // preventScroll：把焦點還給漢堡鈕時不要把畫面拉回頁首。
  const close = () => {
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  };

  // 點選單裡的連結時不把焦點搶回漢堡鈕（使用者要去別的地方了），
  // 並在此同步解除捲動鎖定 —— 這個 handler 跑完瀏覽器才會執行連結的
  // 預設行為，body 若還鎖著 overflow 就捲不到錨點。
  const closeForNavigation = () => {
    setOpen(false);
    document.body.style.overflow = "";
  };

  // Esc 關閉，Tab 在面板內循環，避免焦點跑到被遮住的頁面上。
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      "a[href], button:not([disabled])",
    );
    if (!focusable || focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="hero-menu-button"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label="開啟選單"
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>

      {/* open 只會由點擊觸發，所以 createPortal 不會在伺服端執行。 */}
      {open
        ? createPortal(
            <div className="mobile-nav" onKeyDown={handleKeyDown}>
              <div
                className="mobile-nav-backdrop"
                onClick={close}
                aria-hidden="true"
              />
              <div
                ref={panelRef}
                id="mobile-nav-panel"
                className="mobile-nav-panel"
                role="dialog"
                aria-modal="true"
                aria-label="網站導覽"
              >
                <div className="mobile-nav-head">
                  <span className="mobile-nav-brand">{brandName}</span>
                  <button
                    ref={closeRef}
                    type="button"
                    className="mobile-nav-close"
                    onClick={close}
                    aria-label="關閉選單"
                  >
                    <span aria-hidden="true">✕</span>
                  </button>
                </div>

                <nav className="mobile-nav-links" aria-label="主要導覽">
                  {links.map((link) => (
                    <NavItem
                      key={link.href}
                      link={link}
                      onNavigate={closeForNavigation}
                    />
                  ))}
                </nav>

                <div className="mobile-nav-cta">
                  <Link
                    className="button"
                    href="/contact"
                    onClick={closeForNavigation}
                  >
                    填寫聯絡表單 <span aria-hidden="true">→</span>
                  </Link>
                  <a
                    className="button button-secondary"
                    href={lineUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={closeForNavigation}
                  >
                    LINE 聯絡顧問 <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
