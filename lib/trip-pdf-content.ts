import "server-only";

import { after } from "next/server";
import type { Trip } from "@/lib/site-content";
import { isTripPdfKey, tripPdfKeyFromDocumentUrl } from "@/lib/storage-keys";
import {
  isRailwayStorageConfigured,
  readTripPdfObject,
  readTripPdfTextObject,
  writeTripPdfTextObject,
} from "@/lib/railway-storage";
import {
  normalizePdfTripContent,
  parseTripPdfPages,
  type PdfTextPage,
  type PdfTripContent,
  type TripPdfTextStatus,
} from "@/lib/trip-pdf-extract";
import { tripPdfSource } from "@/lib/trip-plans";

// 行程 PDF 上傳後自動擷取一次，結果存在 Bucket（trip-pdf-text/）。
// PDF 檔名不會重複也不會被覆寫，所以同一份 PDF 的結果永遠有效，伺服器記憶體也留一份。
// 舊的行程（這個功能上線前上傳的 PDF）第一次有人看行程頁時在背景補抓，不拖慢頁面。

const remembered = new Map<string, PdfTripContent>();
const extracting = new Set<string>();
const failedAt = new Map<string, number>();
const retryAfterMs = 10 * 60 * 1000;
const isDesignPreview = () => process.env.NODE_ENV === "development" && process.env.FOUND_DESIGN_PREVIEW === "1";

function remember(pdfKey: string, content: PdfTripContent) {
  if (remembered.size >= 300) remembered.delete(remembered.keys().next().value!);
  remembered.set(pdfKey, content);
}

export async function extractTripPdfText(bytes: Uint8Array): Promise<PdfTripContent> {
  const { getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes);
  try {
    const pages: PdfTextPage[] = [];
    for (let number = 1; number <= Math.min(pdf.numPages, 60); number++) {
      const page = await pdf.getPage(number);
      const { height } = page.getViewport({ scale: 1 });
      const text = await page.getTextContent();
      const round = (value: number) => Math.round(value * 10) / 10;
      pages.push({
        height,
        items: text.items.flatMap((item) =>
          "str" in item
            ? [
                {
                  str: item.str,
                  x: round(item.transform[4]),
                  y: round(item.transform[5]),
                  height: round(item.height || Math.abs(item.transform[3])),
                  hasEOL: item.hasEOL,
                },
              ]
            : [],
        ),
      });
    }
    return parseTripPdfPages(pages);
  } finally {
    await pdf.loadingTask.destroy();
  }
}

/** 擷取並存起來。抽不到內容（例如掃描檔）也存一份空結果，之後不再重試。 */
export async function storeTripPdfText(pdfKey: string, bytes?: Uint8Array) {
  if (!isTripPdfKey(pdfKey) || extracting.has(pdfKey)) return;
  extracting.add(pdfKey);
  try {
    const source = bytes ?? (await readTripPdfObject(pdfKey));
    if (!source) return;
    const content = await extractTripPdfText(source);
    await writeTripPdfTextObject(pdfKey, content);
    remember(pdfKey, content);
    failedAt.delete(pdfKey);
  } catch (error) {
    failedAt.set(pdfKey, Date.now());
    console.error("Unable to extract trip PDF text", pdfKey, error);
  } finally {
    extracting.delete(pdfKey);
  }
}

function pdfKeyOf(documentUrl: string) {
  const key = tripPdfKeyFromDocumentUrl(documentUrl);
  if (key || !isDesignPreview()) return key;
  // 本機設計預覽的快照存的是正式站完整網址。
  try {
    const url = new URL(documentUrl);
    const previewKey = url.pathname === "/api/trip-pdf" ? url.searchParams.get("key") : null;
    return isTripPdfKey(previewKey) ? previewKey : null;
  } catch {
    return null;
  }
}

async function readPreviewText(pdfKey: string) {
  const { readFile } = await import("node:fs/promises");
  const name = pdfKey.slice("trip-pdfs/".length, -".pdf".length);
  try {
    return normalizePdfTripContent(JSON.parse(await readFile(`${process.cwd()}/work/trip-pdf-text/${name}.json`, "utf8")));
  } catch {
    return null;
  }
}

type Lookup = { content: PdfTripContent } | { missing: true } | { unavailable: true };

async function lookupTripPdfText(pdfKey: string): Promise<Lookup> {
  const cached = remembered.get(pdfKey);
  if (cached) return { content: cached };
  if (isDesignPreview()) {
    const content = await readPreviewText(pdfKey);
    return content ? { content } : { missing: true };
  }
  if (!isRailwayStorageConfigured()) return { unavailable: true };

  try {
    const stored = normalizePdfTripContent(await readTripPdfTextObject(pdfKey));
    if (stored) {
      remember(pdfKey, stored);
      return { content: stored };
    }
  } catch (error) {
    console.error("Unable to read trip PDF text", pdfKey, error);
    return { unavailable: true };
  }

  // 還沒擷取過（或擷取規則改版）：回應送出後在背景補抓，下一位訪客就看得到。
  if (!extracting.has(pdfKey) && !recentlyFailed(pdfKey)) {
    after(() => storeTripPdfText(pdfKey));
  }
  return { missing: true };
}

function recentlyFailed(pdfKey: string) {
  return Date.now() - (failedAt.get(pdfKey) ?? 0) <= retryAfterMs;
}

/** 行程頁用：第一個附 PDF 的版本擷取出的內容。有多個版本時一併回傳版本名稱。 */
export async function getTripPdfItinerary(trip: Trip) {
  const source = tripPdfSource(trip, pdfKeyOf);
  if (!source) return null;
  const found = await lookupTripPdfText(source.pdfKey);
  return "content" in found ? { content: found.content, planLabel: source.planLabel } : null;
}

/** 後台用：某份 PDF 的整理結果與狀態。還沒整理過會在背景開始整理。 */
export async function getTripPdfTextStatus(pdfKey: string): Promise<TripPdfTextStatus> {
  const found = await lookupTripPdfText(pdfKey);
  if ("content" in found) {
    // 跟行程頁同一個門檻：只抓到一天多半是排版沒認出來，行程頁不會顯示。
    return found.content.days.length >= 2 ? { status: "ready", content: found.content } : { status: "unreadable" };
  }
  if ("unavailable" in found) return { status: "unavailable" };
  return recentlyFailed(pdfKey) && !extracting.has(pdfKey) ? { status: "failed" } : { status: "processing" };
}
