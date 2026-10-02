"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TravelImage } from "./TravelImage";

const interval = 6500;

export function HeroCarousel({ images }: { images: string[] }) {
  // current / previous 同時保存，讓新照片以遮罩由右向左「擦」進來，舊照片留在底下。
  const [position, setPosition] = useState({ current: 0, previous: -1 });
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [failed, setFailed] = useState<string[]>([]);
  const [loaded, setLoaded] = useState<string[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  // 第一張載入完成、並稍待片刻後才載入其餘照片，讓首屏頻寬優先給封面。
  const [armed, setArmed] = useState(false);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const slides = useMemo(() => {
    const available = images.filter((src) => !failed.includes(src));
    return available.length ? available : ["/trips/tokyo.jpg"];
  }, [images, failed]);
  const active = position.current % slides.length;
  const multiple = slides.length > 1;
  const running = multiple && !paused && !reducedMotion && !hidden && !hovered && loaded.length >= 2;

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setReducedMotion(query.matches);
    const syncVisibility = () => setHidden(document.hidden);
    syncMotion();
    syncVisibility();
    query.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      query.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(
      () =>
        setPosition((state) => {
          for (let step = 1; step < slides.length; step++) {
            const next = (state.current + step) % slides.length;
            if (loaded.includes(slides[next])) return { current: next, previous: state.current };
          }
          return state;
        }),
      interval,
    );
    return () => window.clearInterval(timer);
  }, [running, loaded, slides]);

  useEffect(() => {
    if (armed || loaded.length < 1) return;
    const timer = window.setTimeout(() => setArmed(true), 1200);
    return () => window.clearTimeout(timer);
  }, [armed, loaded.length]);

  function select(next: number) {
    setArmed(true);
    const normalized = (next + slides.length) % slides.length;
    if (normalized === active) return;
    if (loaded.includes(slides[normalized])) {
      setPosition({ current: normalized, previous: active });
      setPending(null);
    } else setPending(slides[normalized]);
    setPaused(true);
  }

  return (
    <div
      className="fh-slides"
      role="region"
      aria-roledescription="輪播"
      aria-label="旅行風景"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={(event) => {
        if (!(event.target instanceof HTMLElement && event.target.classList.contains("fh-slide-toggle"))) setPaused(true);
      }}
      onTouchStart={(event) => {
        const point = event.touches[0];
        touch.current = { x: point.clientX, y: point.clientY };
      }}
      onTouchEnd={(event) => {
        const point = event.changedTouches[0];
        if (touch.current) {
          const dx = point.clientX - touch.current.x;
          const dy = point.clientY - touch.current.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) select(active + (dx < 0 ? 1 : -1));
        }
        touch.current = null;
      }}
    >
      <div className="fh-slide-stack" aria-hidden="true">
        {slides.map((src, slideIndex) => (slideIndex === 0 || armed) && (
          <div
            key={src}
            className={`fh-slide${slideIndex === active ? " is-active" : ""}${slideIndex === position.previous % slides.length && slideIndex !== active ? " is-previous" : ""}`}
          >
            <TravelImage
              src={src}
              alt=""
              priority={slideIndex === 0}
              sizes="100vw"
              className="fh-media"
              onLoad={() => {
                setLoaded((current) => (current.includes(src) ? current : [...current, src]));
                if (pending === src) {
                  setPosition((state) => ({ current: slideIndex, previous: state.current }));
                  setPending(null);
                }
              }}
              onError={() => {
                setFailed((current) => (current.includes(src) ? current : [...current, src]));
                if (pending === src) setPending(null);
              }}
            />
          </div>
        ))}
      </div>
      {pending && (
        <span className="fh-slide-loading" role="status">
          風景載入中…
        </span>
      )}
      {multiple && (
        <div className="fh-slide-controls">
          <div className="fh-slide-dots" role="group" aria-label="選擇風景">
            {slides.map((src, i) => (
              <button key={src} type="button" aria-label={`第 ${i + 1} 張風景`} aria-pressed={i === active} onClick={() => select(i)}>
                <span>{i === active && running ? <i key={`${active}-${position.previous}`} style={{ animationDuration: `${interval}ms` }} /> : null}</span>
              </button>
            ))}
          </div>
          <span className="fh-slide-count" aria-hidden="true">
            <b>{String(active + 1).padStart(2, "0")}</b> / {String(slides.length).padStart(2, "0")}
          </span>
          <button type="button" className="fh-slide-arrow" aria-label="上一張風景" onClick={() => select(active - 1)}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6" /></svg>
          </button>
          <button type="button" className="fh-slide-arrow" aria-label="下一張風景" onClick={() => select(active + 1)}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>
          </button>
          {!reducedMotion && (
            <button type="button" className="fh-slide-arrow fh-slide-toggle" onClick={() => setPaused(!paused)} aria-label={paused ? "播放輪播" : "暫停輪播"}>
              {paused ? (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M7 5h3.5v14H7zm6.5 0H17v14h-3.5z" /></svg>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
