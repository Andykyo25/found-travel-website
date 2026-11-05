// 從行程 PDF 的文字抽出每日行程、餐食、住宿與團費包含／不含。
// 不用 AI：依文字在頁面上的位置排出閱讀順序，再找「第 N 天」「食」「宿」這些固定標記。
// 這個檔案只處理已經抽出來的文字（純函式，方便測試）；讀 PDF 檔在 trip-pdf-content.ts。

export type PdfTextItem = { str: string; x: number; y: number; height: number; hasEOL: boolean };
export type PdfTextPage = { height: number; items: PdfTextItem[] };

export type PdfTripDay = { day: number; title: string; description: string; meals: string; hotel: string };
export type PdfTripContent = {
  /** 擷取規則的版本；規則改了就換版本，舊結果會重新擷取。 */
  version: number;
  days: PdfTripDay[];
  includes: string[];
  excludes: string[];
};

export const pdfTripContentVersion = 1;

/** 後台查詢某份 PDF 的整理結果。 */
export type TripPdfTextStatus =
  | { status: "ready"; content: PdfTripContent }
  /** 整理過，但讀不到每日行程（掃描檔或沒認出的排版）。 */
  | { status: "unreadable" }
  /** 還在背景整理。 */
  | { status: "processing" }
  /** 整理時出錯，稍後會自動重試。 */
  | { status: "failed" }
  /** 儲存空間暫時讀不到。 */
  | { status: "unavailable" };

const cjk = "\\u3400-\\u9fff";
const spacedCjk = new RegExp(`(?:[${cjk}] ){2,}[${cjk}]`, "g");
const spacedHotelChars = new RegExp(`(^|\\s)([${cjk}]) ([${cjk}])(?=\\s)`, "g");
const dayMarker = /^第\s*(\d{1,2}|[一二三四五六七八九十]{1,3})\s*[天日]\s*(.*)$/;
const mealLine = /^(食(\s|$)|早餐\s*[:：]|早\s*[:：])/;
const hotelLine = /^(宿(\s|$)|住宿\s*[:：])/;
const blockStart = /^[【◎●★※•▲■◆☆]|^\d{1,2}[.、]/;
const hotelWord = /(或|同級|飯店|酒店|HOTEL|Hotel|旅館|Inn|INN|Resort|RESORT|公寓)/;
const connector = /[→~～＋+、〃(（-]$/;
const numerals: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

type Line = { text: string; page: number; x: number; y: number; h: number; block: number; skip?: boolean };
type Block = { id: number; page: number; x: number; top: number; bottom: number; lines: number[] };
type RawLine = { text: string; x: number; y: number; h: number };

function chineseNumber(text: string) {
  if (/^\d+$/.test(text)) return Number(text);
  if (!text.includes("十")) return numerals[text] ?? 0;
  const [tens, ones] = text.split("十");
  return (tens ? (numerals[tens] ?? 0) : 1) * 10 + (ones ? (numerals[ones] ?? 0) : 0);
}

function clean(line: string): string {
  // 「宿 仁 川 ...」的標籤先拆開，免得跟後面的字一起被收掉空白。
  const label = line.match(/^\s*([宿食])\s+/);
  if (label) return `${label[1]} ${clean(line.slice(label[0].length))}`.trim();
  return line
    .replace(/\s+/g, " ")
    // 「購 物 中 心」這種逐字加空白的排版收回來。
    .replace(spacedCjk, (match) => match.replace(/ /g, ""))
    .replace(/【\s+/g, "【")
    .replace(/\s+】/g, "】")
    .trim();
}

function joinText(parts: string[]) {
  return parts.reduce(
    (all, part) => (!all ? part : /[A-Za-z0-9.,)]$/.test(all) && /^[A-Za-z0-9(]/.test(part) ? `${all} ${part}` : all + part),
    "",
  );
}

function joinParagraphs(lines: string[]) {
  const paragraphs: string[] = [];
  for (const line of lines) {
    const last = paragraphs.at(-1);
    if (!last || blockStart.test(line) || /[。！!？?]$/.test(last)) paragraphs.push(line);
    else paragraphs[paragraphs.length - 1] = joinText([last, line]);
  }
  return paragraphs;
}

function cleanMeals(text: string) {
  return text
    .replace(/^食\s*/, "")
    .replace(/[:：]\s*(?:[xX]\s*)+(?=\s|$|[早午晚])/g, "：—")
    .replace(/\s*(早餐|午餐|晚餐|早|午|晚)\s*[:：]\s*/g, " $1：")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanTitle(text: string) {
  return (
    text
      .replace(/(機場|空港)\s+(?!→)/g, "$1→")
      .replace(/\s*→\s*/g, "→")
      .replace(/→{2,}/g, "→")
      .trim()
      // 有些 PDF 的出發地印了兩次（「桃園國際機場 桃園國際機場」）。
      .split("→")
      .filter((stop, at, stops) => at === 0 || stop !== stops[at - 1])
      .join("→")
  );
}

function cleanHotel(text: string) {
  // 「仁 川 AIR SKY」→「仁川 AIR SKY」
  return text.replace(/\s+/g, " ").replace(spacedHotelChars, "$1$2$3").trim();
}

function unbalanced(text: string) {
  return (text.match(/[(（]/g)?.length ?? 0) > (text.match(/[)）]/g)?.length ?? 0);
}

/** 把一頁的文字組成行，相鄰的行組成區塊，區塊依頁面由上而下、由左而右排序。 */
function pageBlocks(page: PdfTextPage) {
  const lines: RawLine[] = [];
  let current: RawLine | null = null;
  for (const item of page.items) {
    current ??= { text: "", x: item.x, y: item.y, h: item.height || 10 };
    current.text += item.str;
    if (item.hasEOL) {
      if (current.text.trim()) lines.push(current);
      current = null;
    }
  }
  if (current?.text.trim()) lines.push(current);

  const blocks: { x: number; top: number; lines: RawLine[] }[] = [];
  let block: (typeof blocks)[number] | null = null;
  for (const line of lines) {
    const prev = block?.lines.at(-1);
    const sameBlock =
      block && prev && Math.abs(line.x - block.x) < 25 && line.y < prev.y + 2 && prev.y - line.y < Math.max(prev.h, line.h) * 2.6;
    if (!sameBlock || !block) {
      block = { x: line.x, top: line.y, lines: [] };
      blocks.push(block);
    }
    block.lines.push(line);
  }
  return blocks.sort((a, b) => (Math.abs(a.top - b.top) < 4 ? a.x - b.x : b.top - a.top));
}

function readLines(pages: PdfTextPage[]) {
  const lines: Line[] = [];
  const blocks: Block[] = [];
  pages.forEach((page, pageIndex) => {
    for (const raw of pageBlocks(page)) {
      const entry: Block = { id: blocks.length, page: pageIndex, x: raw.x, top: raw.top, bottom: raw.lines.at(-1)?.y ?? raw.top, lines: [] };
      blocks.push(entry);
      for (const line of raw.lines) {
        const text = clean(line.text);
        if (!text) continue;
        entry.lines.push(lines.length);
        lines.push({ text, page: pageIndex, x: line.x, y: line.y, h: line.h, block: entry.id });
      }
    }
  });
  // 每頁頁首頁尾重複出現的字、頁碼拿掉。
  const pagesOf = new Map<string, Set<number>>();
  for (const line of lines) {
    const seen = pagesOf.get(line.text) ?? new Set<number>();
    seen.add(line.page);
    pagesOf.set(line.text, seen);
  }
  for (const line of lines) {
    const height = pages[line.page].height;
    const edge = line.y < 70 || line.y > height - 70;
    if ((edge && (pagesOf.get(line.text)?.size ?? 0) >= 3) || /^[-\s]*\d{1,3}[-\s]*$/.test(line.text)) line.skip = true;
  }
  return { lines, blocks };
}

export function parseTripPdfPages(pages: PdfTextPage[]): PdfTripContent {
  const { lines, blocks } = readLines(pages);
  const used = new Set<number>();

  // 標籤（「第 1 天」「宿」）右邊、跟標籤同高的文字區塊。
  const sideBlock = (label: Line) => {
    const block = blocks.find(
      (b) => b.page === label.page && b.id !== label.block && b.x > label.x + 15 && b.top + 14 >= label.y && b.bottom - 14 <= label.y,
    );
    return block ? block.lines.filter((i) => !used.has(i) && !lines[i].skip) : [];
  };
  // 同一區塊內、緊接在後面的行。
  const following = (index: number, accept: (text: string, taken: number[]) => boolean, max: number) => {
    const taken: number[] = [];
    for (let i = index + 1; i < lines.length && taken.length < max; i++) {
      if (lines[i].skip) continue;
      if (lines[i].block !== lines[index].block || used.has(i) || !accept(lines[i].text, taken)) break;
      taken.push(i);
    }
    return taken;
  };

  const markers: { index: number; day: number; rest: string }[] = [];
  lines.forEach((line, index) => {
    const match = line.skip ? null : line.text.match(dayMarker);
    if (match) markers.push({ index, day: chineseNumber(match[1]), rest: match[2] });
  });

  const days: PdfTripDay[] = [];
  markers.forEach((marker, k) => {
    const end = markers[k + 1]?.index ?? lines.length;
    const range: number[] = [];
    for (let i = marker.index + 1; i < end; i++) if (!lines[i].skip) range.push(i);
    const mealAt = range.find((i) => mealLine.test(lines[i].text));
    const hotelAt = range.find((i) => hotelLine.test(lines[i].text));
    // 航班表裡的「第 1 天」後面沒有餐食住宿，不算一天。
    if (mealAt === undefined && hotelAt === undefined) return;
    if (marker.day < 1 || days.some((day) => day.day === marker.day)) return;
    used.add(marker.index);
    const stopAt = Math.min(...[mealAt, hotelAt].filter((i): i is number => i !== undefined));

    // 標題：寫在「第 N 天」同一行，或在標籤右邊的區塊。
    let titleLines: number[] = [];
    if (marker.rest) {
      titleLines = following(
        marker.index,
        (text, taken) => {
          const prev = taken.length ? lines[taken.at(-1)!].text : marker.rest;
          if (/[。]/.test(text) || /^[【◎●※★]/.test(text)) return false;
          return /[→~～＋+]/.test(text) || connector.test(prev) || unbalanced(prev) || text.length <= 8;
        },
        3,
      );
    } else {
      titleLines = sideBlock(lines[marker.index]);
      if (!titleLines.length) {
        const first = range.find((i) => i < stopAt && /→/.test(lines[i].text) && !/[。]/.test(lines[i].text));
        if (first !== undefined) titleLines = [first, ...following(first, (text) => !/[。]/.test(text), 3)];
      }
    }
    titleLines.forEach((i) => used.add(i));
    // 標題換行常落在另一個區塊，往後接續看起來像路線的行。
    for (const i of range) {
      if (i >= stopAt || titleLines.length >= 4) break;
      if (used.has(i)) continue;
      const text = lines[i].text;
      const prev = titleLines.length ? lines[titleLines.at(-1)!].text : marker.rest;
      const connects = Boolean(prev) && (connector.test(prev) || unbalanced(prev));
      if (!prev || /[。]/.test(text) || (/^[【◎●※★]/.test(text) && !connects)) break;
      const route = /→/.test(text) && !/[，,]\S{6,}[，,]/.test(text);
      if (!(route || connects || (text.length <= 12 && !/[，,]/.test(text)))) break;
      titleLines.push(i);
      used.add(i);
    }
    const title = cleanTitle(joinText([marker.rest, ...titleLines.map((i) => lines[i].text)].filter(Boolean)));

    // 住宿先找，免得飯店名稱被當成餐食的續行。
    let hotel = "";
    if (hotelAt !== undefined) {
      used.add(hotelAt);
      const rest = lines[hotelAt].text.replace(/^(宿|住宿\s*[:：])\s*/, "");
      let parts: number[] = [];
      if (rest) {
        parts = [hotelAt];
        if (!/^(溫暖的家|夜宿機上|機上)/.test(rest)) {
          parts.push(...following(hotelAt, (text) => hotelWord.test(text) && !/[→。]/.test(text), 3));
        }
      } else {
        parts = sideBlock(lines[hotelAt]);
      }
      parts.forEach((i) => used.add(i));
      hotel = cleanHotel(joinText(parts.map((i) => (i === hotelAt ? rest : lines[i].text))));
    }

    let meals = "";
    if (mealAt !== undefined) {
      used.add(mealAt);
      const meal = lines[mealAt];
      // 餐食太長時會換行，或被拆成同一列右邊的另一段。
      const more = range
        .filter((i) => {
          const line = lines[i];
          if (i <= mealAt || used.has(i) || line.page !== meal.page || line.y > meal.y + 3 || line.y < meal.y - 30) return false;
          if (line.x < meal.x - 5 && line.y < meal.y - 3) return false;
          return (
            !hotelLine.test(line.text) &&
            !dayMarker.test(line.text) &&
            !/^[【◎●※]/.test(line.text) &&
            !/(HOTEL|Hotel|INN|Inn|Resort|公寓|同級)/.test(line.text)
          );
        })
        .slice(0, 2);
      more.forEach((i) => used.add(i));
      meals = cleanMeals(joinText([mealAt, ...more].map((i) => lines[i].text)));

      // 沒有「宿」標籤時，餐食正下方的一串飯店名稱就是住宿。
      if (!hotel) {
        const parts: number[] = [];
        for (const i of range) {
          const line = lines[i];
          if (i <= mealAt || used.has(i)) continue;
          if (line.page !== meal.page || line.y >= meal.y || line.y < meal.y - 120 || parts.length >= 4) break;
          if (!hotelWord.test(line.text) || /[→。]/.test(line.text)) break;
          parts.push(i);
        }
        parts.forEach((i) => used.add(i));
        hotel = cleanHotel(joinText(parts.map((i) => lines[i].text)));
      }
    }

    // 說明：標題之後、餐食住宿之前，還沒被用掉的行。
    const body = range.filter((i) => i < stopAt && !used.has(i)).map((i) => lines[i].text);
    days.push({ day: marker.day, title, description: joinParagraphs(body).join("\n"), meals, hotel });
  });
  days.sort((a, b) => a.day - b.day);

  const text = lines.filter((line) => !line.skip).map((line) => line.text);
  const section = (heading: RegExp) => {
    const at = text.findIndex((line) => heading.test(line));
    if (at < 0) return [];
    const items: string[] = [];
    const first = text[at].replace(heading, "").replace(/^[:：\s]+/, "");
    if (first) items.push(first);
    for (let j = at + 1; j < text.length && items.length < 15; j++) {
      const line = text[j];
      if (/^(※|【|●|★|注意|團費|費用|報名|ps\.)/i.test(line) || dayMarker.test(line)) break;
      if (/^\d{1,2}[.、]/.test(line) || !items.length) items.push(line.replace(/^\d{1,2}[.、]\s*/, ""));
      else items[items.length - 1] = joinText([items[items.length - 1], line]);
    }
    return items;
  };

  return {
    version: pdfTripContentVersion,
    days,
    includes: section(/^(團費包含|費用包含\s*[:：]?$)/),
    excludes: section(/^(團費不含|團費不包含|費用不含)/),
  };
}

const limit = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/** 從 Bucket 讀回來的擷取結果先檢查過再用；版本不符或格式不對就當作沒有。 */
export function normalizePdfTripContent(value: unknown): PdfTripContent | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Partial<Record<keyof PdfTripContent, unknown>>;
  if (source.version !== pdfTripContentVersion || !Array.isArray(source.days)) return null;
  const days = source.days
    .slice(0, 40)
    .map((day): PdfTripDay | null => {
      if (!day || typeof day !== "object") return null;
      const item = day as Record<string, unknown>;
      const number = typeof item.day === "number" && Number.isInteger(item.day) ? item.day : 0;
      if (number < 1 || number > 60) return null;
      return {
        day: number,
        title: limit(item.title, 300),
        description: limit(item.description, 6000),
        meals: limit(item.meals, 300),
        hotel: limit(item.hotel, 400),
      };
    })
    .filter((day): day is PdfTripDay => day !== null);
  const list = (items: unknown) =>
    Array.isArray(items) ? items.map((item) => limit(item, 400)).filter(Boolean).slice(0, 20) : [];
  return { version: pdfTripContentVersion, days, includes: list(source.includes), excludes: list(source.excludes) };
}
