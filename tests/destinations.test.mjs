import assert from "node:assert/strict";
import test from "node:test";
import { destinationIntro, destinationPath, destinationTitle, findTripDestination, relatedTrips, tripDestinations } from "../lib/destinations.ts";
import { plainText, socialMetadata, truncateText } from "../lib/page-metadata.ts";
import { stampTripUpdates } from "../lib/trip-summary.ts";

const today = Date.UTC(2026, 10, 11);
const trip = (id, badge, region, patch = {}) => ({ id, slug: id, badge, region, title: `${id} 行程`, days: "5日", price: "價格洽詢", summary: "", image: "", featured: false, plans: [], departures: [], ...patch });
const dated = (price) => ({ departures: [{ id: "old", date: "2026-01-01", price: "9,900" }, { id: "d", date: "2027-01-10", price }], price });
const trips = [
  trip("tokyo-a", "日本", "東京"),
  trip("hokkaido", "日本", "北海道", dated("35,900")),
  trip("tokyo-b", "日本", "東京", dated("29,900")),
  trip("seoul", "韓國", "首爾"),
  trip("nowhere", "", "火星"),
  trip("custom", "獨家企劃", "不丹"),
];

test("destinations follow the trip category and list dated trips first", () => {
  const all = tripDestinations(trips, today);
  assert.deepEqual(all.map((d) => [d.name, d.slug, d.path, d.trips.length]), [["日本", "japan", "/destinations/japan", 3], ["韓國", "korea", "/destinations/korea", 1], ["獨家企劃", "獨家企劃", "/destinations/獨家企劃", 1]]);
  const japan = all[0];
  assert.deepEqual(japan.trips.map((t) => t.id), ["hokkaido", "tokyo-b", "tokyo-a"]);
  assert.deepEqual(japan.regions.map((r) => [r.name, r.trips.map((t) => t.id)]), [["北海道", ["hokkaido"]], ["東京", ["tokyo-b", "tokyo-a"]]]);
  assert.equal(japan.datedCount, 2);
  assert.equal(japan.lowestPrice, 29900, "已出發的團期不算");
  assert.equal(all[1].lowestPrice, null);
});
test("a destination is found by its slug or its category name", () => {
  const all = tripDestinations(trips, today);
  assert.equal(findTripDestination(all, "japan")?.name, "日本");
  assert.equal(findTripDestination(all, encodeURIComponent("日本"))?.slug, "japan");
  assert.equal(findTripDestination(all, encodeURIComponent("獨家企劃"))?.name, "獨家企劃");
  assert.equal(findTripDestination(all, "%E0%A4%A"), undefined);
  assert.equal(findTripDestination(all, "mars"), undefined);
  assert.equal(destinationPath("郵輪"), "/destinations/cruises");
  assert.equal(destinationTitle("日本"), "日本旅遊行程");
});
test("the intro only states what the data shows", () => {
  const [japan, korea] = tripDestinations(trips, today);
  assert.equal(destinationIntro(japan), "找到了旅行社目前有 3 個日本行程，涵蓋北海道、東京。其中 2 個已公布出發日期，團費 NT$29,900 起；其餘行程的團期與報價可直接向顧問洽詢。");
  assert.equal(destinationIntro(korea), "找到了旅行社目前有 1 個韓國行程。行程的團期與報價可直接向顧問洽詢。");
  const allDated = tripDestinations([trip("a", "日本", "東京", dated("20,000"))], today)[0];
  assert.equal(destinationIntro(allDated), "找到了旅行社目前有 1 個日本行程。全部已公布出發日期，團費 NT$20,000 起。");
});
test("related trips prefer the same region, then the same category, never the trip itself", () => {
  assert.deepEqual(relatedTrips(trips, trips[0]).map((t) => t.id), ["tokyo-b", "hokkaido"]);
  assert.deepEqual(relatedTrips(trips, trips[3]).map((t) => t.id), []);
  assert.equal(relatedTrips(trips, trips[0], 1).length, 1);
});
test("only trips whose content changed get a new update time", () => {
  const before = { trips: [{ ...trips[0], updatedAt: "2026-01-01T00:00:00.000Z" }, trips[1], trips[3]] };
  const next = { trips: [{ ...trips[0] }, { ...trips[1], title: "改了名稱" }, { ...trips[3], updatedAt: "2030-01-01T00:00:00.000Z" }, trips[5]] };
  const stamped = stampTripUpdates(next, before, "2026-11-11T00:00:00.000Z").trips;
  assert.equal(stamped[0].updatedAt, "2026-01-01T00:00:00.000Z", "沒變：沿用原本的時間，即使送來的資料沒帶");
  assert.equal(stamped[1].updatedAt, "2026-11-11T00:00:00.000Z", "內容變了");
  assert.equal("updatedAt" in stamped[2], false, "沒變且原本沒有紀錄：不採用送來的時間");
  assert.equal(stamped[3].updatedAt, "2026-11-11T00:00:00.000Z", "新行程");
  assert.equal(stampTripUpdates(next, null, "2026-11-11T00:00:00.000Z").trips.every((t) => t.updatedAt === "2026-11-11T00:00:00.000Z"), true);
});
test("descriptions are plain text and social tags are complete", () => {
  assert.equal(plainText("❄️ 極光機率爆表！\n🐺 極地野生動物園\n◆慶州佛國寺 ◆瞻星台"), "極光機率爆表！ 極地野生動物園 慶州佛國寺 瞻星台");
  assert.equal(truncateText("一二三四五", 4), "一二三…");
  assert.equal(truncateText("一二三", 4), "一二三");
  const tags = socialMetadata({ title: "關於我們", description: "說明", path: "/about" });
  assert.deepEqual(tags.openGraph, { title: "關於我們｜找到了旅行社", description: "說明", url: "/about", siteName: "找到了旅行社", type: "website", locale: "zh_TW", images: [{ url: "/og-cover.jpg", width: 1200, height: 630, alt: "找到了旅行社暖日旅誌" }] });
  assert.deepEqual(tags.twitter.images, ["/og-cover.jpg"]);
  assert.deepEqual(socialMetadata({ title: "行程", description: "", path: "/trips/x", image: "https://example.com/a.jpg" }).openGraph.images, [{ url: "https://example.com/a.jpg" }]);
  assert.equal(socialMetadata({ title: "找到了旅行社｜首頁", description: "", path: "/" }).openGraph.title, "找到了旅行社｜首頁");
});
