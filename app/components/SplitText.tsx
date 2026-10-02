import type { CSSProperties, ElementType } from "react";

// 把文字拆成「片語 → 字」兩層，讓標題可以逐字從遮罩下方升起。
// 片語之間（逗號、句號）才允許換行；標點會黏在前一個字上，避免行首出現標點。
const phraseBreak = /(?<=[，,。；;、！!？?：:])/u;
const closing = /^[，,。；;、！!？?：:）」』》〉】\])”’…—]+$/u;
const token = /[A-Za-z0-9’'&.\-/]+|\s+|[\s\S]/gu;

type Unit = { text: string; space?: boolean };

function units(phrase: string): Unit[] {
  const out: Unit[] = [];
  for (const match of phrase.match(token) ?? []) {
    if (/^\s+$/.test(match)) out.push({ text: " ", space: true });
    else if (closing.test(match) && out.length && !out[out.length - 1].space)
      out[out.length - 1].text += match;
    else out.push({ text: match });
  }
  return out;
}

export function SplitText({
  text,
  as: Tag = "span",
  className = "",
  step = 34,
  start = 0,
  intro = false,
  lit = false,
  id,
  track,
}: {
  text: string;
  as?: ElementType;
  className?: string;
  /** 每個字之間的延遲（毫秒）。 */
  step?: number;
  /** 第一個字的起始延遲（毫秒）。 */
  start?: number;
  /** 首屏標題：載入後直接播放，不等待捲動進入畫面。 */
  intro?: boolean;
  /** 隨捲動逐字點亮（取代升起動畫），需要 track 提供進度。 */
  lit?: boolean;
  id?: string;
  /** 以 FoundMotion 的 data-track 模式提供 --p 捲動進度。 */
  track?: "enter" | "view" | "exit";
}) {
  let index = 0;
  const phrases = text
    .split(phraseBreak)
    .map((phrase) => phrase.trim())
    .filter(Boolean);

  return (
    <Tag
      id={id}
      className={`split${intro ? " split-intro" : ""}${lit ? " split-lit" : ""}${className ? ` ${className}` : ""}`}
      aria-label={text}
      data-split=""
      data-track={track}
      style={{ "--n": phrases.reduce((sum, p) => sum + units(p).filter((u) => !u.space).length, 0) } as CSSProperties}
    >
      {phrases.map((phrase, phraseIndex) => (
        <span className="split-phrase" key={phraseIndex} aria-hidden="true">
          {units(phrase).map((unit, unitIndex) => {
            if (unit.space) return " ";
            const i = index++;
            return (
              <span className="split-ch" key={unitIndex}>
                <span
                  className="split-ch-i"
                  style={{ "--i": i, "--d": `${start + i * step}ms` } as CSSProperties}
                >
                  {unit.text}
                </span>
              </span>
            );
          })}
        </span>
      ))}
    </Tag>
  );
}
