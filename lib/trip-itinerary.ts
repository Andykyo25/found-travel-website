// 每日行程與條列內容的共用工具；不 import 伺服器端模組，後台與前台都能用。

import type { Trip, TripDay } from "./site-content";
import type { PdfTripContent } from "./trip-pdf-extract";

export type ParsedDay = { title: string; description: string; meals: string; hotel: string };

// 「第1天」「第 一 日」「Day 1」「DAY01」「D1」開頭的行視為新的一天。
const dayMarker =
  /^(?:第\s*[0-9０-９一二三四五六七八九十]+\s*[天日]|D(?:AY)?\s*[-.]?\s*\d{1,2})(?![0-9A-Za-z])\s*[:：.、\-—–)）]?\s*(.*)$/i;
const mealLine = /^(?:餐食|早餐|午餐|晚餐|早\s*[:：]|午\s*[:：]|晚\s*[:：])/;
const hotelLine = /^(?:住宿|宿泊|飯店|酒店|旅館)\s*[:：]?\s*/;

/**
 * 從 PDF 複製出來的整段行程拆成每日行程。第一個「第 N 天」之前的文字（標題、注意事項）略過；
 * 餐食與住宿行各自放進對應欄位，其餘依原順序當作當天說明。
 */
export function parseItineraryText(text: string): ParsedDay[] {
  const days: ParsedDay[] = [];
  let current: (ParsedDay & { lines: string[] }) | null = null;
  const finish = () => {
    if (!current) return;
    const lines = current.lines;
    const title = current.title || lines.shift() || "";
    days.push({ title, description: lines.join("\n"), meals: current.meals, hotel: current.hotel });
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    const marker = line.match(dayMarker);
    if (marker) {
      finish();
      current = { title: marker[1].trim(), description: "", meals: "", hotel: "", lines: [] };
      continue;
    }
    if (!current) continue;
    if (mealLine.test(line)) current.meals = current.meals ? `${current.meals}／${line}` : line;
    else if (hotelLine.test(line)) current.hotel = line.replace(hotelLine, "");
    else current.lines.push(line);
  }
  finish();
  return days.filter((day) => day.title || day.description);
}

/** 「每行一項」的文字轉成清單，去掉開頭的項目符號。 */
export function listLines(text: string | undefined) {
  return (text ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s•・·●○◎▪■□◆◇※*\-–—]+/u, "").trim())
    .filter(Boolean);
}

export type ResolvedItinerary = {
  days: TripDay[];
  includes: string[];
  excludes: string[];
  /** 每日行程的來源：業務在後台手動填寫，或從行程 PDF 自動擷取。 */
  source: "manual" | "pdf" | null;
  /** 從 PDF 擷取、而且行程有好幾個版本時，標出用的是哪個版本。 */
  planLabel: string;
};

/**
 * 行程頁要顯示的每日行程與費用說明。後台手動填的優先；沒填的部分用 PDF 自動擷取的結果。
 * PDF 只抓到一天多半是格式沒認出來，寧可不顯示。
 */
export function resolveTripItinerary(
  trip: Pick<Trip, "itinerary" | "includes" | "excludes">,
  pdf: { content: PdfTripContent; planLabel: string } | null,
): ResolvedItinerary {
  const manualDays = trip.itinerary ?? [];
  const pdfDays = pdf && pdf.content.days.length >= 2 ? pdf.content.days : [];
  const days: TripDay[] = manualDays.length
    ? manualDays
    : pdfDays.map((day) => ({
        id: `pdf-day-${day.day}`,
        title: day.title,
        description: day.description,
        meals: day.meals,
        hotel: day.hotel,
      }));
  const manualIncludes = listLines(trip.includes);
  const manualExcludes = listLines(trip.excludes);
  const includes = manualIncludes.length ? manualIncludes : (pdf?.content.includes ?? []);
  const excludes = manualExcludes.length ? manualExcludes : (pdf?.content.excludes ?? []);
  const usesPdf =
    (!manualDays.length && pdfDays.length > 0) ||
    (!manualIncludes.length && includes.length > 0) ||
    (!manualExcludes.length && excludes.length > 0);
  return {
    days,
    includes,
    excludes,
    source: manualDays.length ? "manual" : pdfDays.length ? "pdf" : null,
    planLabel: usesPdf ? (pdf?.planLabel ?? "") : "",
  };
}

/** 後台「複製到下方修改」：把 PDF 整理的內容變成可以手動編輯的每日行程與費用說明。 */
export function copyPdfContent(
  content: Pick<PdfTripContent, "days" | "includes" | "excludes">,
  makeId: () => string,
): Pick<Trip, "itinerary" | "includes" | "excludes"> {
  return {
    itinerary: content.days.map((day) => ({
      id: makeId(),
      title: day.title,
      description: day.description,
      meals: day.meals,
      hotel: day.hotel,
    })),
    includes: content.includes.join("\n"),
    excludes: content.excludes.join("\n"),
  };
}
