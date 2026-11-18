import { TravelImage } from "@/app/components/TravelImage";
import styles from "./FilmDeck.module.css";

export type FilmFrame = { src: string; alt: string; tag?: string };

// 開頭右側的兩條斜放膠捲：往相反方向慢慢流動，帶一點透視。
// 進場時整組從深處飛近；滑鼠停在上面會暫停。純 CSS 動畫，偏好減少動態時靜止。
// 每條畫兩輪照片，捲到一半時無縫接回開頭。
export function FilmDeck({ rows }: { rows: FilmFrame[][] }) {
  return (
    <figure className={styles.deckWrap} aria-label={`膠捲照片：${rows.flat().map((frame) => frame.alt).join("、")}`}>
      <div className={styles.deck}>
        {rows.map((frames, row) => (
          <div className={`${styles.strip} ${row % 2 ? styles.reverse : ""}`} key={row}>
            <div className={styles.track} style={{ ["--count" as string]: frames.length }}>
              {[...frames, ...frames].map((frame, index) => {
                const n = index % frames.length;
                const copy = index >= frames.length;
                return (
                  <div className={styles.frame} key={index} aria-hidden={copy || undefined}>
                    <div className={styles.photo}>
                      <TravelImage src={frame.src} alt={copy ? "" : frame.alt} priority={row === 0 && index < 2} sizes="(max-width: 760px) 40vw, 16vw" />
                      {frame.tag && <span className={styles.tag} aria-hidden="true">#{frame.tag}</span>}
                    </div>
                    <span className={styles.mark} aria-hidden="true">
                      <b>{String(row * frames.length + n + 1).padStart(2, "0")}</b>
                      TABIYOI 2026 · 旅よい · {String(24 + n).padStart(2, "0")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </figure>
  );
}
