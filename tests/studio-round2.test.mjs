import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSiteContent } from "../lib/site-content.ts";
import {
  applyAutoPrices,
  coverThumbnail,
  formatStartPrice,
  lowestUpcomingPrice,
  priceMismatch,
  resolveTripPrice,
  tripListSummary,
} from "../lib/trip-summary.ts";
import { keepSinglePlanCoveringAll, planCoversAllDepartures } from "../lib/trip-plans.ts";

const today = Date.UTC(2026, 9, 3); // 2026/10/03

const plan = (overrides = {}) => ({
  id: "plan-a",
  airline: "長榮航空",
  title: "標準行程",
  summary: "",
  price: "",
  documentType: "pdf",
  documentUrl: "/api/trip-pdf?key=trip-pdfs%2Fa.pdf",
  documentName: "a.pdf",
  departureMode: "all",
  departureIds: [],
  ...overrides,
});

const trip = (overrides = {}) => ({
  id: "trip-a",
  featured: true,
  badge: "日本",
  region: "東京",
  days: "5日",
  title: "東京慢旅",
  summary: "簡介",
  price: "NT$99,999 起／人",
  image: "https://images.unsplash.com/photo-1?auto=format&fit=crop&w=1600&q=85",
  plans: [plan()],
  departures: [
    { id: "d-past", date: "2026/09/01", price: "9,000" }, // 已過：不能拿來當起價
    { id: "d-1", date: "2026/11/04", price: "31,900" },
    { id: "d-2", date: "2026/10/20", price: "NT$29,900" },
    { id: "d-3", date: "2026/12/01", price: "洽詢" }, // 無法判讀的價格直接略過
  ],
  ...overrides,
});

test("lowest upcoming price ignores expired dates and unreadable prices", () => {
  assert.equal(lowestUpcomingPrice(trip(), today), 29900);
  assert.equal(lowestUpcomingPrice(trip({ departures: [] }), today), null);
  assert.equal(
    lowestUpcomingPrice(trip({ departures: [{ id: "x", date: "2026/09/01", price: "1,000" }] }), today),
    null,
  );
  assert.equal(formatStartPrice(29900), "NT$29,900 起／人");
});

test("auto price follows the departures; manual price is left alone", () => {
  assert.equal(resolveTripPrice(trip({ priceMode: "auto" }), today), "NT$29,900 起／人");
  assert.equal(resolveTripPrice(trip(), today), "NT$99,999 起／人");
  // 沒有可計算的團期價格時，保留原本的文字
  assert.equal(resolveTripPrice(trip({ priceMode: "auto", departures: [], price: "價格請洽詢" }), today), "價格請洽詢");
});

test("auto price on the public path rewrites only auto trips and never mutates the input", () => {
  const content = { trips: [trip({ id: "auto", priceMode: "auto" }), trip({ id: "manual" })] };
  const before = JSON.stringify(content);
  const result = applyAutoPrices(content, today);
  assert.equal(result.trips[0].price, "NT$29,900 起／人");
  assert.equal(result.trips[1].price, "NT$99,999 起／人");
  assert.equal(JSON.stringify(content), before);
  const manualOnly = { trips: [trip()] };
  assert.equal(applyAutoPrices(manualOnly, today), manualOnly);
});

test("price mismatch warns only for a manual price that disagrees with the departures", () => {
  assert.equal(priceMismatch(trip(), today), 29900);
  assert.equal(priceMismatch(trip({ price: "NT$29,900 起" }), today), null);
  assert.equal(priceMismatch(trip({ priceMode: "auto" }), today), null);
  assert.equal(priceMismatch(trip({ departures: [] }), today), null);
});

test("the collapsed row summary reports price, next departure and document status", () => {
  const summary = tripListSummary(trip({ priceMode: "auto" }), today);
  assert.equal(summary.price, "NT$29,900 起／人");
  assert.equal(summary.auto, true);
  assert.equal(summary.nextDate, "2026/10/20");
  assert.equal(summary.upcomingCount, 3);
  assert.equal(summary.totalDepartures, 4);
  assert.deepEqual([summary.documentsReady, summary.documentsTotal], [1, 1]);

  const pending = tripListSummary(trip({ departures: [], plans: [plan({ documentUrl: "" })] }), today);
  assert.equal(pending.nextDate, null);
  assert.equal(pending.upcomingCount, 0);
  assert.deepEqual([pending.documentsReady, pending.documentsTotal], [0, 1]);
});

test("cover thumbnails shrink Unsplash photos and leave other sources untouched", () => {
  const thumb = new URL(coverThumbnail("https://images.unsplash.com/photo-1?auto=format&fit=crop&w=1600&q=85"));
  assert.equal(thumb.searchParams.get("w"), "240");
  assert.equal(thumb.searchParams.get("q"), "60");
  assert.equal(coverThumbnail("/api/hero-image?key=hero-images%2Fx.webp"), "/api/hero-image?key=hero-images%2Fx.webp");
  assert.equal(coverThumbnail("/trips/tokyo.jpg"), "/trips/tokyo.jpg");
});

test("a single-version trip keeps covering every date after new dates are added", () => {
  const before = trip({ plans: [plan({ departureMode: "all" })] });
  const added = { ...before, departures: [...before.departures, { id: "d-new", date: "2026/12/24", price: "30,000" }] };
  // 批次新增會把版本改成「指定團期」；單一版本要還原成「適用所有團期」
  const batch = {
    ...added,
    plans: [plan({ departureMode: "selected", departureIds: added.departures.map((d) => d.id) })],
  };
  const result = keepSinglePlanCoveringAll(before, batch);
  assert.equal(result.plans[0].departureMode, "all");
  assert.deepEqual(result.plans[0].departureIds, []);
  assert.equal(planCoversAllDepartures(result.plans[0], result.departures), true);
});

test("leftover uncovered dates and multi-version trips are not silently re-attached", () => {
  const partial = trip({ plans: [plan({ departureMode: "selected", departureIds: ["d-1"] })] });
  const after = { ...partial, departures: [...partial.departures, { id: "d-new", date: "2026/12/24", price: "30,000" }] };
  assert.equal(keepSinglePlanCoveringAll(partial, after), after);

  const two = trip({ plans: [plan(), plan({ id: "plan-b", departureMode: "selected", departureIds: ["d-1"] })] });
  const twoAfter = { ...two, departures: [...two.departures, { id: "d-new", date: "2026/12/24", price: "30,000" }] };
  assert.equal(keepSinglePlanCoveringAll(two, twoAfter), twoAfter);
});

test("saved content keeps the auto price mode and still reads old content as manual", () => {
  const content = normalizeSiteContent({
    trips: [
      { ...trip({ id: "t-auto", priceMode: "auto" }) },
      { ...trip({ id: "t-manual" }) },
      { ...trip({ id: "t-bogus", priceMode: "weekly" }) },
    ],
  });
  assert.equal(content.trips[0].priceMode, "auto");
  assert.equal("priceMode" in content.trips[1], false);
  assert.equal("priceMode" in content.trips[2], false);
});
