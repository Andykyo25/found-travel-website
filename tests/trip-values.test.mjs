import assert from "node:assert/strict";
import test from "node:test";
import {
  parseDepartureDate,
  upcomingDepartures,
  taipeiTodayTime,
  formatDepartureDate,
  priceValue,
  formatPrice,
} from "../lib/trip-values.ts";
import { validateTripDates } from "../lib/trip-validation.ts";
import { configuredSiteOrigin } from "../lib/site-origin.ts";
import { filterTrips, tripFilterHref } from "../lib/trip-filters.ts";

test("month and budget must match the same departure and region stays in the query", () => {
  const trip = {
    id: "one",
    price: "10000",
    region: "日本",
    badge: "精選",
    departures: [
      { date: "2099/01/01", price: "38900(228連假)" },
      { date: "2099/02/01", price: "20000" },
      { date: "2000/01/01", price: "10000" },
    ],
  };
  const filters = {
    month: "2099-01",
    budget: "b1",
    region: "日本",
    category: "精選",
  };
  assert.equal(filterTrips([trip], filters).length, 0);
  assert.equal(filterTrips([trip], { ...filters, budget: "b2" }).length, 1);
  assert.equal(
    filterTrips([trip], { ...filters, budget: "b2", region: "韓國" }).length,
    0,
  );
  assert.equal(
    new URL(
      tripFilterHref(filters, true),
      "https://example.com",
    ).searchParams.get("region"),
    "日本",
  );
});

test("calendar parsing rejects malformed and impossible dates without guessing", () => {
  for (const date of [
    "202070321",
    "2026/02/29",
    "2026/04/31",
    "2026/13/01",
    "2026/9",
    "2026912",
    "abc2026/09/12",
    "2026/9/123",
  ])
    assert.equal(parseDepartureDate(date), null, date);
  assert.equal(formatDepartureDate("2026/9/8(亞航)"), "2026/09/08(亞航)");
  assert.equal(formatDepartureDate("20280229"), "2028/02/29");
});

test("upcoming departures sort padded and unpadded dates together and exclude invalid rows", () => {
  const rows = ["2026/9/12", "2026/09/08", "2026/01/01", "202070321"].map(
    (date) => ({ date }),
  );
  assert.deepEqual(
    upcomingDepartures(rows, Date.UTC(2026, 8, 7)).map((d) => d.date),
    ["2026/09/08", "2026/9/12"],
  );
  assert.equal(
    taipeiTodayTime(new Date("2026-09-07T16:00:00Z")),
    Date.UTC(2026, 8, 8),
  );
});

test("price parsing never appends holiday digits to the amount", () => {
  assert.equal(priceValue("38,900(228連假)"), 38900);
  assert.equal(priceValue("價格洽詢"), null);
  assert.equal(formatPrice("13900起"), "NT$13,900 起／人");
  assert.equal(formatPrice("38,900(228連假)"), "NT$38,900／人 (228連假)");
  assert.equal(formatPrice("30000 - 40000"), "30000 - 40000");
  assert.equal(formatPrice("30000 含稅"), "30000 含稅");
});

test("publishing identifies invalid rows and ambiguous same-day prices", () => {
  const content = {
    trips: [{ title: "測試行程", departures: [{ date: "202070321" }] }],
  };
  assert.match(validateTripDates(content), /第 1 筆/);
  assert.equal(validateTripDates({ trips: [null] }), "行程格式不正確");
  content.trips[0].departures = [
    { date: "2026/12/3", price: "31900" },
    { date: "2026/12/03", price: "39900" },
  ];
  assert.match(validateTripDates(content), /價格不同/);
  content.trips[0].departures[1].note = "升等住宿";
  assert.equal(validateTripDates(content), null);
});

test("optional canonical origin accepts only an HTTPS origin", () => {
  assert.equal(configuredSiteOrigin(""), null);
  assert.equal(
    configuredSiteOrigin("https://travel.example.com/"),
    "https://travel.example.com",
  );
  for (const url of [
    "http://example.com",
    "https://name:password@example.com",
    "https://example.com/path",
    "https://example.com/?token=x",
  ])
    assert.throws(() => configuredSiteOrigin(url));
});

test("keyword search uses published itinerary text, aliases, and combines with filters", async () => {
  const { readTripFilters, matchesTripKeyword } = await import("../lib/trip-filters.ts");
  const trip = { id: "japan", title: "日本東北溫泉", region: "TOHOKU", summary: "賞楓與慢旅行", badge: "秋季", days: "5日", price: "35000", departures: [], plans: [{ documentUrl: "https://example.com/tour.pdf", airline: "長榮航空", title: "標準版", accommodation: "溫泉飯店" }, { documentUrl: "", title: "未公開郵輪" }] };
  for (const q of ["東北", "日本", "日本 東北", "ＴＯＨＯＫＵ", "長榮 溫泉", "　賞楓　"]) assert.equal(matchesTripKeyword(trip, q), true, q);
  for (const q of ["韓國", "日本 郵輪", "未公開郵輪"]) assert.equal(matchesTripKeyword(trip, q), false, q);
  const f = readTripFilters({ q: " 日本 東北 ", budget: "b2", region: "TOHOKU" });
  assert.equal(filterTrips([trip], f).length, 1);
  assert.equal(filterTrips([trip], { ...f, budget: "b1" }).length, 0);
  assert.equal(filterTrips([trip], { ...f, category: "夏季" }).length, 0);
  const url = new URL(tripFilterHref(f, true), "https://example.com");
  assert.equal(url.searchParams.get("q"), "日本 東北");
  assert.equal(url.searchParams.get("all"), "1");
  assert.equal(readTripFilters({ q: ["a", "b"] }).keyword, "a");
  assert.equal(readTripFilters({ q: "a".repeat(100) }).keyword.length, 60);
  assert.equal(matchesTripKeyword({ ...trip, title: "東京慢旅", region: "TOKYO・HAKONE" }, "日本"), true);
  assert.equal(matchesTripKeyword({ ...trip, title: "中國東北", region: "中國", summary: "", plans: [] }, "日本"), false);
});
