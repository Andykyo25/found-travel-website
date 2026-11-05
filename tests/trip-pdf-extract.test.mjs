import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { tripPdfTextKey } from "../lib/storage-keys.ts";
import { resolveTripItinerary } from "../lib/trip-itinerary.ts";
import { normalizePdfTripContent, parseTripPdfPages, pdfTripContentVersion } from "../lib/trip-pdf-extract.ts";

// 一行文字（pdf.js 的 text item）：x、y 是左下角座標，y 越大越上面。
const line = (str, x, y) => ({ str, x, y, height: 12, hasEOL: true });
const page = (...items) => ({ height: 842, items });
const header = line("找到了旅行社", 36, 815);

test("days, meals, hotels and costs are read from a one-column PDF; flight tables and page headers are ignored", () => {
  const content = parseTripPdfPages([
    page(
      header,
      // 航班表裡的「第 N 天」後面沒有餐食住宿，不能當成一天。
      line("第 1 天 中國國際航空 CA186 桃園 TPE 北京 PEK", 36, 700),
      line("第 15 天 中國國際航空 CA185 北京 PEK 台北 TPE", 36, 680),
      line("第 1 天 桃園國際機場 桃園國際機場  布拉格", 36, 600),
      line("今日集合於桃園機場，搭機前往布拉格。", 36, 580),
      line("食 早：X X X 午：X 晚：機上", 36, 556),
      line("宿 夜宿機上", 36, 536),
    ),
    page(
      header,
      line("第 2 天 布拉格→293km→維也納", 36, 760),
      line("◎維也納 音樂之都，", 36, 740),
      line("皇宮與教堂林立。", 36, 725),
      line("食 早：飯店內享用 午：敬請自理 晚：炸豬排風味餐", 36, 700),
      line("宿 Prize by Radisson Vienna 或同級", 36, 680),
      line("2", 290, 30),
    ),
    page(
      header,
      line("團費包含：", 36, 700),
      line("1.來回經濟艙機票", 36, 680),
      line("2.住宿及表列餐食", 36, 662),
      line("團費不含：", 36, 640),
      line("1.私人消費", 36, 620),
    ),
  ]);

  assert.equal(content.version, pdfTripContentVersion);
  assert.deepEqual(content.days, [
    { day: 1, title: "桃園國際機場→布拉格", description: "今日集合於桃園機場，搭機前往布拉格。", meals: "早：— 午：— 晚：機上", hotel: "夜宿機上" },
    { day: 2, title: "布拉格→293km→維也納", description: "◎維也納 音樂之都，皇宮與教堂林立。", meals: "早：飯店內享用 午：敬請自理 晚：炸豬排風味餐", hotel: "Prize by Radisson Vienna 或同級" },
  ]);
  assert.deepEqual(content.includes, ["來回經濟艙機票", "住宿及表列餐食"]);
  assert.deepEqual(content.excludes, ["私人消費"]);
});

test("titles and hotels printed beside the 「第 N 天」 and 「宿」 labels are picked up in reading order", () => {
  const content = parseTripPdfPages([
    page(
      // 標題在標籤右邊、從標籤上方開始，排版上比標籤先出現。
      line("飯店→慶州佛國寺→瞻星台→東宮月池+月精橋→西面鬧", 101, 712),
      line("區→飯店", 101, 690),
      line("第 2 天", 46, 700),
      line("【佛國寺】新羅王朝時期的佛教藝術巔峰。", 36, 660),
      line("【 屈 斜 路 湖 】日本最大的火山湖。", 36, 645),
      line("食 早：飯店內用 午：馬鈴薯燉豬骨湯 晚：敬請自理", 45, 620),
      // 飯店名稱在「宿」右邊，而且比「宿」先出現；不能被當成餐食的續行。
      line("釜山 ARBAN CITY 或 釜山 TRT 或", 72, 598),
      line("同級", 72, 580),
      line("宿", 45, 585),
    ),
  ]);
  assert.deepEqual(content.days, [
    {
      day: 2,
      title: "飯店→慶州佛國寺→瞻星台→東宮月池+月精橋→西面鬧區→飯店",
      description: "【佛國寺】新羅王朝時期的佛教藝術巔峰。\n【屈斜路湖】日本最大的火山湖。",
      meals: "早：飯店內用 午：馬鈴薯燉豬骨湯 晚：敬請自理",
      hotel: "釜山 ARBAN CITY 或 釜山 TRT 或同級",
    },
  ]);
});

test("stored results are checked before use and re-extracted when the rules change", () => {
  assert.equal(normalizePdfTripContent({ version: pdfTripContentVersion - 1, days: [], includes: [], excludes: [] }), null);
  assert.equal(normalizePdfTripContent("nope"), null);
  const stored = normalizePdfTripContent({
    version: pdfTripContentVersion,
    days: [{ day: 1, title: "A", description: "x".repeat(7000), meals: "", hotel: "" }, { day: 0, title: "bad" }, "bad"],
    includes: ["機票", 3, ""],
  });
  assert.equal(stored.days.length, 1);
  assert.equal(stored.days[0].description.length, 6000);
  assert.deepEqual(stored.includes, ["機票"]);
  assert.deepEqual(stored.excludes, []);
});

test("manual itinerary wins; otherwise the PDF days are shown, but not a lone day", () => {
  const day = (n) => ({ day: n, title: `D${n}`, description: "", meals: "", hotel: "" });
  const pdf = { content: { version: 1, days: [day(1), day(2)], includes: ["機票"], excludes: ["小費"] }, planLabel: "長榮｜A 版" };

  const fromPdf = resolveTripItinerary({}, pdf);
  assert.equal(fromPdf.source, "pdf");
  assert.deepEqual(fromPdf.days.map((d) => [d.id, d.title]), [["pdf-day-1", "D1"], ["pdf-day-2", "D2"]]);
  assert.deepEqual([fromPdf.includes, fromPdf.excludes, fromPdf.planLabel], [["機票"], ["小費"], "長榮｜A 版"]);

  const manual = resolveTripItinerary(
    { itinerary: [{ id: "m", title: "手動", description: "", meals: "", hotel: "" }], includes: "住宿", excludes: "" },
    pdf,
  );
  assert.equal(manual.source, "manual");
  assert.deepEqual(manual.days.map((d) => d.title), ["手動"]);
  assert.deepEqual([manual.includes, manual.excludes], [["住宿"], ["小費"]]);

  const lone = resolveTripItinerary({}, { ...pdf, content: { ...pdf.content, days: [day(1)], includes: [], excludes: [] } });
  assert.deepEqual([lone.days, lone.source, lone.planLabel], [[], null, ""]);
  assert.equal(resolveTripItinerary({}, null).source, null);
});

test("PDF text is stored next to its PDF and extracted on upload or on first view", async () => {
  const pdfKey = "trip-pdfs/1760000000000-123e4567-e89b-12d3-a456-426614174000.pdf";
  assert.equal(tripPdfTextKey(pdfKey), "trip-pdf-text/1760000000000-123e4567-e89b-12d3-a456-426614174000.json");
  assert.throws(() => tripPdfTextKey("trip-pdfs/../content/site-content.pdf"));

  const [route, content, tripPage] = await Promise.all(
    ["../app/api/studio/pdf/route.ts", "../lib/trip-pdf-content.ts", "../app/trips/[slug]/page.tsx"].map((file) =>
      readFile(new URL(file, import.meta.url), "utf8"),
    ),
  );
  assert.match(route, /after\(\(\) => storeTripPdfText\(uploadedKey, bytes\)\)/);
  assert.match(content, /after\(\(\) => storeTripPdfText\(pdfKey\)\)/);
  assert.match(tripPage, /resolveTripItinerary\(trip, await getTripPdfItinerary\(trip\)\)/);
  assert.match(tripPage, /tripJsonLd\(\{ \.\.\.trip, itinerary: itinerary\.days \}/);
});
