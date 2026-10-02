"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

// 全站動態層：捲動顯影、捲動進度、導覽列收合、情境游標與磁吸按鈕。
// 一切皆為漸進增強：未載入 JS 或偏好減少動態時，內容維持原樣完整可讀。
export function FoundMotion() {
  const pathname = usePathname();
  const bar = useRef<HTMLDivElement>(null);
  const cursor = useRef<HTMLDivElement>(null);
  const cursorLabel = useRef<HTMLSpanElement>(null);
  const rescan = useRef<() => void>(() => {});

  useEffect(() => {
    const root = document.documentElement;
    const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fineQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    let reduced = reduceQuery.matches;
    let frame = 0;
    let lastY = window.scrollY;
    let observer: IntersectionObserver | null = null;
    let trackers: HTMLElement[] = [];

    const syncMode = () => {
      reduced = reduceQuery.matches;
      root.classList.toggle("fx", !reduced);
      if (reduced) root.querySelectorAll("[data-rv], .split").forEach((el) => el.setAttribute("data-in", ""));
    };

    const reveal = (el: Element) => {
      el.setAttribute("data-in", "");
      observer?.unobserve(el);
    };

    const scan = () => {
      if (reduced) {
        root.querySelectorAll("[data-rv], .split").forEach((el) => el.setAttribute("data-in", ""));
        return;
      }
      observer ??= new IntersectionObserver(
        (entries) => entries.forEach((entry) => entry.isIntersecting && reveal(entry.target)),
        { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
      );
      document
        .querySelectorAll("[data-rv]:not([data-rv-seen]), .split:not(.split-intro):not([data-rv-seen])")
        .forEach((el) => {
          el.setAttribute("data-rv-seen", "");
          observer?.observe(el);
        });
      trackers = Array.from(document.querySelectorAll<HTMLElement>("[data-track]"));
    };
    rescan.current = scan;

    const header = () => document.querySelector<HTMLElement>(".site-header");

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const vh = window.innerHeight;
      const max = document.documentElement.scrollHeight - vh;
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? clamp(y / max) : 0})`;

      const head = header();
      if (head) {
        const hero = document.querySelector<HTMLElement>(".fh-hero");
        const threshold = hero ? Math.max(120, hero.offsetHeight - 140) : 24;
        const menuOpen = document.body.style.overflow === "hidden";
        const down = y > lastY + 4;
        const up = y < lastY - 4;
        head.dataset.scrolled = String(y > threshold);
        if (menuOpen || y < 120 || up) head.dataset.hidden = "false";
        else if (down && y > threshold) head.dataset.hidden = "true";
      }
      lastY = y;

      if (!reduced) {
        for (const el of trackers) {
          const rect = el.getBoundingClientRect();
          if (rect.bottom < -vh || rect.top > vh * 2) continue;
          const mode = el.dataset.track;
          const p =
            mode === "exit"
              ? clamp(-rect.top / Math.max(1, rect.height))
              : mode === "enter"
                ? clamp((vh - rect.top) / Math.max(1, vh))
                : clamp((vh - rect.top) / (vh + rect.height));
          el.style.setProperty("--p", p.toFixed(4));
        }
      }
    };
    // 跑馬燈速度隨捲動速度加快，停下後緩緩回到原速。
    let speed = 1;
    let speedFrame = 0;
    let lastScroll = window.scrollY;
    const easeSpeed = () => {
      speedFrame = 0;
      const marquee = document.querySelector(".fh-marquee-track");
      const animation = marquee?.getAnimations()[0];
      if (!animation) return;
      const delta = Math.abs(window.scrollY - lastScroll);
      lastScroll = window.scrollY;
      const target = 1 + Math.min(9, delta * 0.35);
      speed += (target - speed) * 0.12;
      animation.updatePlaybackRate(speed);
      if (Math.abs(speed - 1) > 0.02 || delta > 0) speedFrame = requestAnimationFrame(easeSpeed);
      else animation.updatePlaybackRate(1);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
      if (!reduced && !speedFrame) speedFrame = requestAnimationFrame(easeSpeed);
    };

    // 情境游標：只在帶有 data-cursor 的區塊上出現，並隨區塊顯示對應動作文字。
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let cursorFrame = 0;
    let magnet: HTMLElement | null = null;

    const tick = () => {
      cx += (tx - cx) * 0.2;
      cy += (ty - cy) * 0.2;
      if (cursor.current) cursor.current.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      cursorFrame = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.3 ? requestAnimationFrame(tick) : 0;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (reduced || !fineQuery.matches || event.pointerType === "touch") return;
      tx = event.clientX;
      ty = event.clientY;
      const target = event.target instanceof Element ? event.target : null;
      const holder = target?.closest<HTMLElement>("[data-cursor]");
      const node = cursor.current;
      if (node && cursorLabel.current) {
        if (holder) {
          if (node.dataset.on !== "true") {
            cx = tx;
            cy = ty;
          }
          cursorLabel.current.textContent = holder.dataset.cursor ?? "";
          node.dataset.on = "true";
        } else node.dataset.on = "false";
      }
      if (!cursorFrame) cursorFrame = requestAnimationFrame(tick);

      // 封面照片的細微視差：游標移動時，照片往反方向偏移一點點。
      const hero = document.querySelector<HTMLElement>(".fh-hero");
      if (hero) {
        const box = hero.getBoundingClientRect();
        if (event.clientY >= box.top && event.clientY <= box.bottom) {
          hero.style.setProperty("--hx", (((event.clientX - box.left) / box.width) * 2 - 1).toFixed(3));
          hero.style.setProperty("--hy", (((event.clientY - box.top) / box.height) * 2 - 1).toFixed(3));
        }
      }

      const wordmark = target?.closest(".fh-footer") ? document.querySelector<HTMLElement>(".fh-wordmark") : null;
      if (wordmark) {
        const box = wordmark.getBoundingClientRect();
        wordmark.style.setProperty("--mx", `${(event.clientX - box.left).toFixed(0)}px`);
        wordmark.style.setProperty("--my", `${(event.clientY - box.top).toFixed(0)}px`);
      }

      const mag = target?.closest<HTMLElement>("[data-magnetic]") ?? null;
      if (magnet && magnet !== mag) magnet.style.transform = "";
      magnet = mag;
      if (mag) {
        const rect = mag.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        mag.style.transform = `translate3d(${(dx * 0.22).toFixed(1)}px, ${(dy * 0.3).toFixed(1)}px, 0)`;
      }
    };
    const onPointerLeave = () => {
      if (cursor.current) cursor.current.dataset.on = "false";
      if (magnet) magnet.style.transform = "";
      magnet = null;
    };

    syncMode();
    scan();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    reduceQuery.addEventListener("change", syncMode);

    // 篩選、換頁時伺服器會送來新的區塊，補上尚未觀察的元素。
    let pending = 0;
    const mutations = new MutationObserver(() => {
      if (pending) return;
      pending = requestAnimationFrame(() => {
        pending = 0;
        scan();
        onScroll();
      });
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(cursorFrame);
      cancelAnimationFrame(speedFrame);
      cancelAnimationFrame(pending);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      reduceQuery.removeEventListener("change", syncMode);
      mutations.disconnect();
      observer?.disconnect();
      root.classList.remove("fx");
    };
  }, []);

  // 換頁後重新掃描新頁面的元素並同步導覽列狀態。
  useEffect(() => {
    rescan.current();
    window.dispatchEvent(new Event("scroll"));
  }, [pathname]);

  return (
    <>
      <div className="fx-progress" aria-hidden="true" ref={bar} />
      <div className="fx-cursor" aria-hidden="true" data-on="false" ref={cursor}>
        <span ref={cursorLabel} />
      </div>
    </>
  );
}
