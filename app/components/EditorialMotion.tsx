"use client";

import { useEffect } from "react";

// Progressive enhancement: content is visible without JavaScript and in reduced motion.
export function EditorialMotion() {
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (query.matches || !("IntersectionObserver" in window)) return;
    const items = document.querySelectorAll<HTMLElement>(".editorial-home [data-reveal]");
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.animate([{ opacity: 0.45, transform: "translateY(24px)" }, { opacity: 1, transform: "translateY(0)" }],
            { duration: 650, easing: "cubic-bezier(.2,.7,.2,1)" });
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.12 });
    items.forEach(item => observer.observe(item));
    const stop = () => {
      if (query.matches) { observer.disconnect(); items.forEach(item => item.getAnimations().forEach(animation => animation.cancel())); }
    };
    query.addEventListener("change", stop);
    return () => { observer.disconnect(); query.removeEventListener("change", stop); items.forEach(item => item.getAnimations().forEach(animation => animation.cancel())); };
  }, []);
  return null;
}
