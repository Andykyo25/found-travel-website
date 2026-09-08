import assert from "node:assert/strict";
import test from "node:test";
import { addDepartureBatch, parseDeparturePaste, validateDepartureBatch } from "../lib/departure-batch.ts";
import { departuresForPlan } from "../lib/trip-plans.ts";
import { validateTripDates } from "../lib/trip-validation.ts";
import { defaultSiteContent, normalizeSiteContent } from "../lib/site-content.ts";

function fixture() {
  return {
    ...defaultSiteContent.trips[0],
    departures: [{ id: "old", date: "2026/10/03", price: "32900", note: "" }],
    plans: [
      { ...defaultSiteContent.trips[0].plans[0], id: "eva", airline: "長榮航空", departureMode: "all", departureIds: [] },
      { ...defaultSiteContent.trips[0].plans[0], id: "china", airline: "中華航空", departureMode: "all", departureIds: [] },
    ],
  };
}

test("Excel paste handles headers, comma prices, CRLF, quoted multiline notes and compact dates", () => {
  const rows = parseDeparturePaste('\uFEFF日期\t價格\t備註\r\n20261008\t32,900\t"兩晚升等\n含\"\"早餐\"\""\r\n2026/11/3\t34900\t\r\n');
  assert.equal(rows.length, 2);
  assert.equal(rows[0].note, '兩晚升等\n含"早餐"');
  const result = validateDepartureBatch(fixture(), "eva", rows);
  assert.equal(result.valid, true);
  assert.equal(result.rows[0].date, "2026/10/08");
  assert.equal(result.rows[1].date, "2026/11/03");
  assert.equal(result.rows[1].price, "34,900");
});

test("paste rejects incomplete cells, extra columns and oversized batches", () => {
  assert.throws(() => parseDeparturePaste('2026/10/08\t32900\t"未閉合'), /引號/);
  assert.throws(() => parseDeparturePaste("2026/10/08\t32900\t備註\t多餘欄"), /三欄/);
  assert.throws(() => parseDeparturePaste(Array(367).fill("2026/10/08\t32900").join("\n")), /366/);
  assert.throws(() => parseDeparturePaste("x".repeat(200001)), /資料過多/);
});

test("preview marks impossible dates, unsafe prices, empty batches and repeated days", () => {
  for (const date of ["2026/02/29", "2026/04/31", "10/08", ""]) {
    assert.equal(validateDepartureBatch(fixture(), "eva", [{ date, price: "32900" }]).valid, false);
  }
  for (const price of ["", "0", "-100", "32900abc", "32,90", "=123", "1e4", "3.5", "9007199254740992"]) {
    assert.equal(validateDepartureBatch(fixture(), "eva", [{ date: "2026/10/08", price }]).valid, false, price);
  }
  assert.equal(validateDepartureBatch(fixture(), "eva", []).valid, false);
  assert.equal(validateDepartureBatch(fixture(), "missing", [{ date: "2026/10/08", price: "32900" }]).valid, false);
  const duplicate = validateDepartureBatch(fixture(), "eva", [
    { date: "20261008", price: "32900" }, { date: "2026/10/8", price: "34900", note: "不同價格" },
  ]);
  assert.equal(duplicate.valid, false);
  assert.ok(duplicate.issues.every(issue => issue.includes("重複日期")));
});

test("batch freezes all-date relationships so only the target airline receives additions", () => {
  const original = fixture();
  const before = structuredClone(original);
  const result = addDepartureBatch(original, "eva", [{ date: "2026/10/08", price: "34900" }], () => "new");
  assert.deepEqual(original, before);
  assert.deepEqual(result.plans[0].departureIds, ["old", "new"]);
  assert.deepEqual(result.plans[1].departureIds, ["old"]);
  assert.ok(result.plans.every(p => p.departureMode === "selected"));
  assert.equal(departuresForPlan(result.departures, result.plans[1]).length, 1);
  assert.equal(validateTripDates({ trips: [result] }), null);
});

test("different versions can have the same departure date with independent prices", () => {
  let trip = addDepartureBatch(fixture(), "eva", [{ date: "2026/10/08", price: "32900" }], () => "eva-new");
  trip = addDepartureBatch(trip, "china", [{ date: "2026/10/08", price: "34900" }], () => "china-new");
  assert.equal(departuresForPlan(trip.departures, trip.plans[0]).at(-1).price, "32,900");
  assert.equal(departuresForPlan(trip.departures, trip.plans[1]).at(-1).price, "34,900");
  assert.equal(validateTripDates({ trips: [trip] }), null);
  trip.plans[1].airline = trip.plans[0].airline;
  trip.plans[1].title = trip.plans[0].title;
  assert.equal(validateTripDates({ trips: [trip] }), null, "stable IDs distinguish versions even before their labels are edited");
});

test("duplicate commits and identifier collisions cannot silently overwrite existing dates", () => {
  const rows = [{ date: "2026/10/08", price: "32900" }];
  const trip = addDepartureBatch(fixture(), "eva", rows, () => "new");
  assert.throws(() => addDepartureBatch(trip, "eva", rows, () => "another"), /已有同日/);
  assert.throws(() => addDepartureBatch(fixture(), "eva", rows, () => "old"), /識別碼/);
  assert.throws(() => addDepartureBatch(fixture(), "eva", [{ date: "bad", price: "32900" }], () => "new"), /日期無效/);
});

test("saving and normalizing preserves batch relationships and optional comparison fields", () => {
  const trip = addDepartureBatch(fixture(), "eva", [{ date: "2026/10/08", price: "32900" }], () => "new");
  trip.plans[0].flight = "早去晚回";
  trip.plans[0].accommodation = "市區四星飯店";
  const saved = normalizeSiteContent({ ...defaultSiteContent, trips: [trip] }).trips[0];
  assert.equal(saved.plans[0].flight, "早去晚回");
  assert.equal(saved.plans[0].accommodation, "市區四星飯店");
  assert.deepEqual(saved.plans[0].departureIds, ["old", "new"]);
  assert.deepEqual(saved.plans[1].departureIds, ["old"]);
  assert.equal(validateTripDates({ trips: [saved] }), null);
});
