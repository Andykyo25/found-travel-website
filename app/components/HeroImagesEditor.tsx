"use client";

import { useRef, useState } from "react";
import { isHeroImageUrl } from "@/lib/hero-slides";

export function HeroImagesEditor({ images, onChange, onBusy }: { images: string[]; onChange: (images: string[]) => void; onBusy: (busy: boolean) => void }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const dragged = useRef<number | null>(null);
  function move(from: number, to: number) {
    if (to < 0 || to >= images.length) return;
    const next = [...images]; next.splice(to, 0, next.splice(from, 1)[0]); onChange(next);
  }
  async function upload(file?: File) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setError("請選擇 8 MB 以內的照片"); return; }
    setUploading(true); onBusy(true); setError("");
    try {
      const data = new FormData(); data.set("file", file);
      const response = await fetch("/api/studio/hero-image", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || "照片上傳失敗");
      onChange([...images, result.url]);
    } catch (err) { setError(err instanceof Error ? err.message : "照片上傳失敗，請再試一次"); }
    finally { setUploading(false); onBusy(false); }
  }
  return <div className="hero-images-editor field-wide">
    <h3>首頁輪播照片</h3>
    <p>最多 8 張。建議使用至少 1920×1080 的橫幅照片，主體放中央，手機裁切也清楚。拖曳卡片或按前移、後移調整順序。</p>
    <div className="hero-image-grid">{images.map((src, i) => <div className="hero-image-card" key={src} draggable={!uploading}
      onDragStart={() => { dragged.current = i; }} onDragEnd={() => { dragged.current = null; }} onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => { event.preventDefault(); if (!uploading && dragged.current !== null) move(dragged.current, i); dragged.current = null; }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={`第 ${i + 1} 張輪播預覽`} draggable={false} />
      <strong>第 {i + 1} 張{i === 0 ? " · 首圖" : ""}</strong>
      <div><button type="button" disabled={uploading || i === 0} onClick={() => move(i, i - 1)}>前移</button><button type="button" disabled={uploading || i === images.length - 1} onClick={() => move(i, i + 1)}>後移</button><button type="button" disabled={uploading} onClick={() => onChange(images.filter((_, j) => j !== i))}>移除</button></div>
    </div>)}</div>
    {!images.length && <p>未指定輪播照片，目前使用原本首頁大圖或第一個行程的封面。</p>}
    <div className="hero-image-add"><label>照片網址或網站路徑<input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://images.unsplash.com/…" /></label><button type="button" disabled={uploading || images.length >= 8} onClick={() => { const value = url.trim(); if (!isHeroImageUrl(value) || value.length > 800) { setError("請輸入 HTTPS 圖片網址或網站內的圖片路徑"); return; } if (images.includes(value)) { setError("這張照片已經在清單中了"); return; } onChange([...images, value]); setUrl(""); setError(""); }}>加入照片</button></div>
    <label className="hero-image-upload">{uploading ? "照片上傳中…" : "或從電腦上傳照片（JPG、PNG、WebP，8 MB 以內）"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading || images.length >= 8} onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }} /></label>
    {error && <p role="alert">{error}</p>}
    <small>上傳或調整後，按「儲存並更新網站」才會套用到首頁。只有一張照片時不會輪播。</small>
  </div>;
}
