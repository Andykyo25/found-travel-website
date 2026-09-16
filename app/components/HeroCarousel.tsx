"use client";

import { useEffect, useRef, useState } from "react";
import { TravelImage } from "./TravelImage";

export function HeroCarousel({ images }: { images: string[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [failed, setFailed] = useState<string[]>([]);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const available = images.filter((src) => !failed.includes(src));
  const slides = available.length ? available : ["/trips/tokyo.jpg"];
  const active = index % slides.length;
  const multiple = slides.length > 1;

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setReducedMotion(query.matches);
    const syncVisibility = () => setHidden(document.hidden);
    syncMotion(); syncVisibility();
    query.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncVisibility);
    return () => { query.removeEventListener("change", syncMotion); document.removeEventListener("visibilitychange", syncVisibility); };
  }, []);

  useEffect(() => {
    if (!multiple || paused || reducedMotion || hidden || hovered) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % slides.length), 6000);
    return () => window.clearInterval(timer);
  }, [multiple, paused, reducedMotion, hidden, hovered, slides.length]);

  function select(next: number) { setIndex((next + slides.length) % slides.length); setPaused(true); }

  return (
    <div className="hero-carousel" role="region" aria-roledescription="輪播" aria-label="旅行風景"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={(event) => { if (!(event.target instanceof HTMLElement && event.target.classList.contains("hero-slide-toggle"))) setPaused(true); }}
      onTouchStart={(event) => { const point = event.touches[0]; touch.current = { x: point.clientX, y: point.clientY }; }}
      onTouchEnd={(event) => { const point = event.changedTouches[0]; if (touch.current) { const dx = point.clientX - touch.current.x; const dy = point.clientY - touch.current.y; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) select(active + (dx < 0 ? 1 : -1)); } touch.current = null; }}>
      {slides.map((src, slideIndex) => (
        <div key={src} className={`hero-slide${slideIndex === active ? " is-active" : ""}`} aria-hidden="true">
          <TravelImage src={src} alt="" priority={slideIndex === 0} sizes="100vw" className="hero-media"
            onError={() => setFailed((current) => current.includes(src) ? current : [...current, src])} />
        </div>
      ))}
      {multiple && <>
        <button type="button" className="hero-slide-arrow hero-slide-prev" aria-label="上一張風景" onClick={() => select(active - 1)}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg></button>
        <button type="button" className="hero-slide-arrow hero-slide-next" aria-label="下一張風景" onClick={() => select(active + 1)}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m10 6 6 6-6 6" /></svg></button>
        <div className="hero-carousel-controls">
          <div className="hero-slide-dots" aria-label="選擇風景">{slides.map((src, i) => <button key={src} type="button" aria-label={`第 ${i + 1} 張風景`} aria-pressed={i === active} onClick={() => select(i)}><span /></button>)}</div>
          <span className="hero-slide-count">{String(active + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</span>
          {!reducedMotion && <button type="button" className="hero-slide-toggle" onClick={() => setPaused(!paused)} aria-label={paused ? "播放輪播" : "暫停輪播"}>{paused ? "▶" : "Ⅱ"}</button>}
        </div>
      </>}
    </div>
  );
}
