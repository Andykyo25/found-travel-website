"use client";

import { useRef, useState } from "react";
import { TravelImage } from "./TravelImage";

// 影片先以海報＋播放鈕呈現，按下後才開始載入與播放；播放中交還原生控制列。
export function FilmPlayer({ src, title, poster }: { src: string; title: string; poster: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);

  function play() {
    const element = video.current;
    if (!element) return;
    setStarted(true);
    void element.play().catch(() => setPlaying(false));
  }

  return (
    <div className="fh-film-frame" data-playing={playing} data-started={started} data-cursor={playing ? undefined : "播放"}>
      {/* 海報用延遲載入的圖片，不隨首屏一起下載；開始播放後由影片取代。 */}
      <TravelImage src={poster} alt="" className="fh-film-poster" sizes="100vw" />
      <video
        ref={video}
        src={src}
        title={title}
        controls={started}
        playsInline
        preload="none"
        onPlay={() => {
          setStarted(true);
          setPlaying(true);
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setStarted(false);
        }}
      >
        您的瀏覽器不支援影片播放。
      </video>
      {!playing && (
        <button type="button" className="fh-film-play" onClick={play} aria-label={`播放影片：${title}`}>
          <span className="fh-film-disc" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5.2v13.6L19.4 12z" /></svg>
          </span>
          <span className="fh-film-label">
            <b>PLAY FILM</b>
            <i>{title}</i>
          </span>
        </button>
      )}
    </div>
  );
}
