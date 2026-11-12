import assert from "node:assert/strict";
import test from "node:test";
import { emptyNeeds, findTravel, validateNeeds, needsSummary, destinationOptions, relaxOptions, exactTwdPrice } from "../lib/travel-finder.ts";
import { destinationGroup } from "../lib/destination-groups.ts";
import { normalizeSiteContent } from "../lib/site-content.ts";
import { parseContactRequestInput, saveContactRequest } from "../lib/contact-requests.ts";
import { S3Client } from "@aws-sdk/client-s3";

const today = Date.UTC(2026, 8, 10);
const base = { id: "trip", region: "日本", title: "測試旅行", days: "5日", price: "30,000", departures: [{ id: "old", date: "2026-09-09", price: "10,000" }, { id: "a", date: "2026-09-10", price: "30,000" }, { id: "b", date: "2026-10-10", price: "40,000" }], plans: [{ id: "p", title: "航空版本", airline: "測試航空", serviceType: "group", priceBasis: "person", departureAirport: "桃園", departureMode: "all", departureIds: [], price: "", documentUrl: "https://example.com/a.pdf", accommodation: "測試飯店" }] };
function search(needs = {}, trip = structuredClone(base)) { return findTravel([trip], { ...emptyNeeds, ...needs }, today); }
const cases = [
  ["past departures excluded, today included", {}, t => t, 1, ["a", "b"]],
  ["unpublished document excluded", {}, t => { t.plans[0].documentUrl = ""; return t; }, 0],
  ["unrestricted group discovery does not require manual service tags", {}, t => { delete t.plans[0].serviceType; return t; }, 1],
  ["custom service does not match group", { service: "custom" }, t => t, 0],
  ["partial service does not match group", { service: "partial" }, t => t, 0],
  ["undecided can browse unknown service", { service: "undecided" }, t => { delete t.plans[0].serviceType; return t; }, 1],
  ["destination mismatch excluded", { destination: "韓國" }, t => t, 0],
  ["airport mismatch excluded", { airport: "高雄" }, t => t, 0],
  ["unknown airport excluded when required", { airport: "桃園" }, t => { delete t.plans[0].departureAirport; return t; }, 0],
  ["upper date boundary inclusive", { end: "2026-09-10" }, t => t, 1, ["a"]],
  ["lower date boundary inclusive", { start: "2026-10-10" }, t => t, 1, ["b"]],
  ["no dates in range yields no candidate", { start: "2027-01-01" }, t => t, 0],
  ["version selected dates respected", {}, t => { t.plans[0].departureMode = "selected"; t.plans[0].departureIds = ["b"]; return t; }, 1, ["b"]],
  ["budget filters individual departures", { budget: "30000" }, t => t, 1, ["a"]],
  ["room pricing excluded from person budget", { budget: "50000" }, t => { t.plans[0].priceBasis = "room"; return t; }, 0],
  ["whole group pricing excluded", { budget: "50000" }, t => { t.plans[0].priceBasis = "group"; return t; }, 0],
  ["bare amounts on untagged plans are read as per person", { budget: "30000" }, t => { delete t.plans[0].priceBasis; return t; }, 1, ["a"]],
  ["bare amounts over the ceiling are excluded, not left pending", { budget: "20000" }, t => { delete t.plans[0].priceBasis; return t; }, 0],
  ["holiday notes after an amount keep the price exact", { budget: "30000" }, t => { t.departures.find(d => d.id === "a").price = "30,000(連假)"; return t; }, 1, ["a"]],
  ["starting prices cannot prove ceiling", { budget: "50000" }, t => { t.departures.forEach(d => d.price = "30,000 起"); return t; }, 0],
  ["range prices cannot prove ceiling", { budget: "50000" }, t => { t.departures.forEach(d => d.price = "30,000～60,000"); return t; }, 0],
  ["invalid date rejected", {}, t => { t.departures = [{ id: "x", date: "2026-02-30", price: "10000" }]; return t; }, 0],
];
for (const [name, needs, transform, count, ids] of cases) test(name, () => {
  const result = search(needs, transform(structuredClone(base)));
  assert.equal(result.candidates.length, count);
  if (ids) assert.deepEqual(result.candidates[0].departures.map(d => d.id), ids);
});
test("same-day airline versions remain distinct and summary preserves raw text and selection", () => {
  const trip = structuredClone(base); trip.plans.push({ ...trip.plans[0], id: "p2", airline: "第二航空" });
  const { candidates } = search({}, trip); assert.equal(candidates.length, 2);
  const summary = needsSummary({ ...emptyNeeds, details: "需要輪椅，請人工確認" }, [{ candidate: candidates[1], departureId: "b" }]);
  assert.match(summary, /2026-10-10/); assert.match(summary, /需要輪椅，請人工確認/); assert.match(summary, /40,000/);
});
test("invalid needs return explicit validation and no misleading recommendations", () => {
  for (const patch of [{ start: "2026-10-01", end: "2026-09-01" }, { people: "1.5" }, { budget: "-1" }, { start: "invalid" }]) {
    assert.ok(validateNeeds({ ...emptyNeeds, ...patch })); assert.equal(search(patch).candidates.length, 0);
  }
});
test("editor metadata round trips without inventing legacy facts", () => {
  const normalized = normalizeSiteContent({ trips: [base] });
  assert.equal(normalized.trips[0].plans[0].serviceType, "group");
  assert.equal(normalized.trips[0].plans[0].priceBasis, "person");
  const legacy = structuredClone(base); delete legacy.plans[0].priceBasis;
  assert.equal(normalizeSiteContent({ trips: [legacy] }).trips[0].plans[0].priceBasis, "unknown");
});
test("contact summary is preserved and length is validated", () => {
  const input = { name: "測試", mobile: "0900000000", preferredTimes: ["anytime"], message: "測".repeat(4500) };
  assert.equal(parseContactRequestInput(input).request.message.length, 4500);
  assert.equal(parseContactRequestInput({ ...input, message: "測".repeat(6001) }).ok, false);
});
test("service-specific fields are preserved only for the selected service", () => {
  const partial = { ...emptyNeeds, service: "partial", returnDate: "2027-02-08", luggage: "需要托運行李", stayTransport: "舊的客製需求" };
  const summary = needsSummary(partial, []);
  assert.match(summary, /回程日期：2027-02-08/); assert.match(summary, /需要托運行李/); assert.doesNotMatch(summary, /舊的客製需求/);
  assert.ok(validateNeeds({ ...partial, start: "2027-02-10" }));
  assert.match(needsSummary({ ...partial, service: "custom" }, []), /舊的客製需求/);
});
test("storage failure is propagated instead of reporting a saved request", async t => {
  t.mock.property(process, "env", { ...process.env, BUCKET_NAME: "test", BUCKET_ENDPOINT: "https://example.invalid", BUCKET_ACCESS_KEY_ID: "test", BUCKET_SECRET_ACCESS_KEY: "test" });
  t.mock.method(S3Client.prototype, "send", async () => { throw new Error("offline"); });
  await assert.rejects(saveContactRequest({ name: "測試", mobile: "0900000000", preferredTimes: ["anytime"], message: "需求" }, "1788998400000-11111111-1111-4111-8111-111111111111"), /offline/);
});
test("retry after a saved request is atomic and never overwrites delivery state", async t => {
  t.mock.property(process, "env", { ...process.env, BUCKET_NAME: "test", BUCKET_ENDPOINT: "https://example.invalid", BUCKET_ACCESS_KEY_ID: "test", BUCKET_SECRET_ACCESS_KEY: "test" });
  const objects = new Map();
  t.mock.method(S3Client.prototype, "send", async command => {
    assert.equal(command.input.IfNoneMatch, "*");
    if (objects.has(command.input.Key)) throw Object.assign(new Error("exists"), { name: "PreconditionFailed" });
    objects.set(command.input.Key, command.input.Body); return {};
  });
  const input = { name: "測試", mobile: "0900000000", preferredTimes: ["anytime"], message: "需求" };
  const token = "1788998400000-11111111-1111-4111-8111-111111111111";
  const a = await saveContactRequest(input, token); const b = await saveContactRequest(input, token);
  assert.equal(a.storageKey, b.storageKey); assert.equal(objects.size, 1);
  await saveContactRequest({ ...input, message: "已修改需求" }, token); assert.equal(objects.size, 2);
});

test("existing explicit price and departure wording work without extra tags", () => {
  const trip = structuredClone(base);
  delete trip.plans[0].priceBasis; delete trip.plans[0].departureAirport;
  trip.plans[0].flight = "桃園出發，早去晚回";
  trip.departures.forEach(d => d.price = "30,000／人");
  const result = search({ airport: "桃園", budget: "35000" }, trip);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.pendingCandidates.length, 0);
});
test("untagged plans remain discoverable separately without pretending to match", () => {
  const trip = structuredClone(base);
  delete trip.plans[0].serviceType; delete trip.plans[0].priceBasis; delete trip.plans[0].departureAirport;
  trip.departures.forEach(d => d.price = "30,000～60,000");
  const result = search({ airport: "桃園", budget: "50000" }, trip);
  assert.equal(result.candidates.length, 0); assert.equal(result.pendingCandidates.length, 1);
  const c = result.pendingCandidates[0];
  assert.equal(c.needsConfirmation, true);
  assert.match(c.pending.join(" "), /價格.*待確認/);
  assert.deepEqual(c.unconfirmed, ["能否從桃園出發待確認", "每人價格能否符合預算待確認"]);
  assert.doesNotMatch(c.reasons.join(" "), /在每人預算內|出發機場：桃園/);
  assert.doesNotMatch(needsSummary({ ...emptyNeeds, budget: "50000" }, [{ candidate: c, departureId: "a" }]), /待確認|；/);
});
test("known mismatches never enter the pending list", () => {
  for (const needs of [{ airport: "高雄" }, { destination: "韓國" }, { budget: "1000" }, { start: "2028-01-01" }, { service: "partial" }]) {
    const result = search(needs); assert.equal(result.candidates.length + result.pendingCandidates.length, 0);
  }
});
test("airport mentions and conflicting origins do not fabricate a departure airport", () => {
  for (const flight of ["到桃園接機", "桃園出發，高雄出發", "TPE-NRT / NRT-TPE", "桃園出發／高雄出發", "出發機場：桃園或高雄"]) {
    const trip = structuredClone(base); delete trip.plans[0].departureAirport; trip.plans[0].flight = flight;
    const result = search({ airport: "桃園" }, trip);
    assert.equal(result.candidates.length, 0); assert.equal(result.pendingCandidates.length, 1);
  }
});
test("conflicting units and starting prices are kept out of budget-confirmed results", () => {
  const trip = structuredClone(base);
  for (const price of ["30,000／房", "30,000 起／人"]) {
    trip.departures.forEach(d => d.price = price);
    const result = search({ budget: "50000" }, trip);
    assert.equal(result.candidates.length, 0); assert.equal(result.pendingCandidates.length, 1);
  }
  trip.departures.forEach(d => d.price = "60,000 起／人");
  assert.equal(search({ budget: "50000" }, trip).pendingCandidates.length, 0);
});
test("confirmed dates do not accidentally include uncertain-priced alternatives", () => {
  const trip = structuredClone(base); trip.departures.find(d => d.id === "b").price = "30,000 起／人";
  assert.deepEqual(search({ budget: "50000" }, trip).candidates[0].departures.map(d => d.id), ["a"]);
});

test("nine legacy published versions are visible when all preferences are unrestricted", () => {
  const trip = structuredClone(base);
  trip.plans = Array.from({ length: 9 }, (_, i) => ({ ...base.plans[0], id: `p${i}`, serviceType: undefined, departureAirport: undefined, priceBasis: undefined }));
  const result = search({}, trip);
  assert.equal(result.candidates.length, 9);
  assert.equal(result.pendingCandidates.length, 0);
  assert.ok(result.candidates.every(c => !c.reasons.includes("跟團旅行")));
  assert.doesNotMatch(needsSummary(emptyNeeds, [{ candidate: result.candidates[0], departureId: "a" }]), /待確認|；/);
});
// ---- 還沒公布團期的行程、目的地分組、放寬條件 ----
const undated = () => { const trip = structuredClone(base); trip.departures = []; trip.price = "價格洽詢"; return trip; };
test("trips without published dates are offered separately for enquiry", () => {
  const result = search({}, undated());
  assert.equal(result.candidates.length + result.pendingCandidates.length, 0);
  assert.equal(result.openCandidates.length, 1);
  const c = result.openCandidates[0];
  assert.deepEqual(c.departures, []); assert.equal(c.needsConfirmation, false);
  assert.match(c.pending.join(" "), /團期尚未公布/);
  assert.match(needsSummary(emptyNeeds, [{ candidate: c, departureId: "" }]), /出發日：團期尚未公布/);
});
test("a requested date range never matches a trip without dates", () => {
  for (const needs of [{ start: "2026-10-01" }, { end: "2027-01-01" }]) assert.equal(search(needs, undated()).openCandidates.length, 0);
});
test("past-only departures count as no published dates", () => {
  const trip = structuredClone(base); trip.departures = [trip.departures[0]];
  assert.equal(search({}, trip).openCandidates.length, 1);
});
test("a version with no upcoming dates is not offered while the trip has dated versions", () => {
  const trip = structuredClone(base);
  trip.plans.push({ ...trip.plans[0], id: "p2", departureMode: "selected", departureIds: ["old"] });
  const result = search({}, trip);
  assert.deepEqual(result.candidates.map(c => c.plan.id), ["p"]); assert.equal(result.openCandidates.length, 0);
});
test("undated trips show one card per trip and prefer a version that needs no confirmation", () => {
  const trip = undated();
  trip.plans = [{ ...trip.plans[0], id: "k", departureAirport: "" }, { ...trip.plans[0], id: "t" }, { ...trip.plans[0], id: "h", departureAirport: "高雄" }];
  const all = search({}, trip).openCandidates;
  assert.equal(all.length, 1); assert.equal(all[0].moreVersions, 2);
  const taoyuan = search({ airport: "桃園" }, trip).openCandidates;
  assert.equal(taoyuan.length, 1); assert.equal(taoyuan[0].plan.id, "t"); assert.equal(taoyuan[0].moreVersions, 1);
  assert.equal(taoyuan[0].needsConfirmation, false);
});
test("budget on undated trips: over is excluded, unreadable is flagged, within is confirmed", () => {
  const priced = price => { const trip = undated(); trip.price = price; return search({ budget: "30000" }, trip).openCandidates; };
  assert.equal(priced("45,000").length, 0);
  assert.equal(priced("45900起").length, 0);
  assert.deepEqual(priced("價格洽詢")[0].unconfirmed, ["每人價格能否符合預算待確認"]);
  assert.deepEqual(priced("25900起")[0].unconfirmed, ["每人價格能否符合預算待確認"]);
  assert.deepEqual(priced("25,900")[0].unconfirmed, []);
  assert.match(priced("25,900")[0].reasons.join(" "), /在每人預算內/);
});
test("confirmed undated trips sort ahead of those needing confirmation", () => {
  const a = undated(); a.id = "a"; const b = undated(); b.id = "b"; b.price = "20,000";
  const result = findTravel([a, b], { ...emptyNeeds, budget: "30000" }, today);
  assert.deepEqual(result.openCandidates.map(c => c.trip.id), ["b", "a"]);
});
test("a destination can be a broad group or the exact region", () => {
  const tokyo = structuredClone(base); tokyo.region = "東京・富士山";
  assert.equal(search({ destination: "日本" }, tokyo).candidates.length, 1);
  assert.equal(search({ destination: "東京・富士山" }, tokyo).candidates.length, 1);
  assert.equal(search({ destination: "東京" }, tokyo).candidates.length, 0);
  assert.equal(search({ destination: "韓國" }, tokyo).candidates.length, 0);
});
test("free-text regions fall into the expected groups", () => {
  const expected = { "日本的山形縣": "日本", "東北・藏王": "日本", "名古屋・北陸": "日本", "四國": "日本", "北歐四國": "歐洲","釜山・首爾": "韓國", "北越・下龍灣": "越南", "中越": "越南", "汶萊・古晉": "東南亞・海島", "馬爾地夫": "東南亞・海島", "布拉格 Prague": "歐洲", "小東歐": "歐洲", "波羅的海・北歐": "歐洲", "地中海郵輪": "郵輪", "歐洲河輪": "郵輪", "基隆出發郵輪": "郵輪", "加拿大黃刀鎮": "美洲", "雪梨・墨爾本": "紐澳", "土耳其": "中東・非洲", "火星": "其他" };
  for (const [region, group] of Object.entries(expected)) assert.equal(destinationGroup(region), group, region);
});
test("destination options list only what can be found, with trip counts", () => {
  const trip = (id, region, patch = {}) => ({ ...structuredClone(base), id, region, ...patch });
  const trips = [trip("a", "東京"), trip("b", "東京", { departures: [] }), trip("c", "北海道"), trip("d", "首爾"), trip("e", "峴港", { plans: [{ ...base.plans[0], documentUrl: "" }] })];
  assert.deepEqual(destinationOptions(trips, "group", today), [
    { group: "日本", count: 3, regions: [{ name: "東京", count: 2 }, { name: "北海道", count: 1 }] },
    { group: "韓國", count: 1, regions: [{ name: "首爾", count: 1 }] },
  ]);
  assert.deepEqual(destinationOptions(trips, "custom", today), []);
});
test("relaxing suggests only the conditions that would actually find trips", () => {
  const trips = [structuredClone(base)];
  const options = relaxOptions(trips, { ...emptyNeeds, destination: "日本", start: "2028-01-01", budget: "50000" }, today);
  assert.deepEqual(options.map(o => [o.label, o.count]), [["不限出發日", 1]]);
  assert.deepEqual(options[0].patch, { start: "", end: "" });
  // 兩個條件都擋住時，單獨放寬任何一項都不夠，才提供一次清掉。
  const both = relaxOptions(trips, { ...emptyNeeds, destination: "韓國", start: "2028-01-01" }, today);
  assert.deepEqual(both.map(o => [o.label, o.count]), [["清除全部條件", 1]]);
  assert.deepEqual(relaxOptions(trips, { ...emptyNeeds, service: "custom" }, today).map(o => o.patch), [{ service: "undecided" }]);
  assert.deepEqual(relaxOptions([], { ...emptyNeeds, destination: "日本" }, today), []);
});
test("exact price parsing keeps starting and range prices out", () => {
  assert.equal(exactTwdPrice("38,900(過年)"), 38900); assert.equal(exactTwdPrice("NT$31,900／人"), 31900);
  for (const price of ["35900起", "30,000～60,000", "30,000(起)", "價格洽詢", ""]) assert.equal(exactTwdPrice(price), null, price);
});

// ---- 送到瀏覽器的精簡行程資料 ----
test("the slim trips sent to the browser match exactly like the full ones", async () => {
  const { finderTrips } = await import("../lib/travel-finder.ts");
  const dated = structuredClone(base);
  dated.summary = "很長的行程摘要".repeat(40); dated.badge = "日本"; dated.featured = true; dated.itinerary = [{ id: "d1", title: "第一天", description: "…", meals: "", hotel: "" }];
  dated.image = "https://images.unsplash.com/photo-1?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8";
  dated.plans.push({ ...dated.plans[0], id: "draft", documentUrl: "" }, { ...dated.plans[0], id: "kh", departureAirport: "高雄", documentName: "查看完整行程", documentUpdatedAt: "2026-09-02" });
  const open = structuredClone(base); open.id = "open"; open.region = "首爾"; open.departures = [open.departures[0]];
  const full = [dated, open];
  const slim = finderTrips(full, today);
  const outline = result => ["candidates", "pendingCandidates", "openCandidates"].map(list => result[list].map(c => [c.key, c.departures.map(d => d.id), c.reasons, c.unconfirmed, c.moreVersions]));
  for (const needs of [{}, { airport: "高雄" }, { airport: "台中" }, { budget: "30000" }, { destination: "韓國" }, { start: "2026-10-01" }, { service: "undecided", budget: "5000" }]) {
    const query = { ...emptyNeeds, ...needs };
    assert.deepEqual(outline(findTravel(slim, query, today)), outline(findTravel(full, query, today)), JSON.stringify(needs));
  }
  assert.deepEqual(slim[0].plans.map(p => p.id), ["p", "kh"], "未公布的版本不送出");
  assert.deepEqual(slim[0].departures.map(d => d.id), ["a", "b"], "已出發的團期不送出");
  assert.equal(slim[0].image, "https://images.unsplash.com/photo-1?q=80&w=1740&auto=format&fit=crop");
  const text = JSON.stringify(slim);
  for (const dropped of ["很長的行程摘要", "第一天", "查看完整行程", "2026-09-02", "ixid"]) assert.ok(!text.includes(dropped), dropped);
  assert.ok(text.length < JSON.stringify(full).length);
});
test("image URLs lose only the Unsplash tracking parameters", async () => {
  const { compactImageUrl } = await import("../lib/trip-summary.ts");
  assert.equal(compactImageUrl("https://plus.unsplash.com/premium_photo-1?w=800&ixid=abc&ixlib=rb-4.1.0&q=80"), "https://plus.unsplash.com/premium_photo-1?w=800&q=80");
  for (const untouched of ["/trips/tokyo.jpg", "/api/hero-image?key=hero-images%2Fx.webp", "https://example.com/a.jpg?ixid=1", ""]) assert.equal(compactImageUrl(untouched), untouched);
});

test("finder destination groups follow the backend category before guessing from the region", async () => {
  const { tripDestinationGroup } = await import("../lib/destination-groups.ts");
  const { destinationOptions, finderTrips } = await import("../lib/travel-finder.ts");
  // 後台分類決定大方向：歐洲五區收成「歐洲」，東南亞與海島收成一類。
  assert.equal(tripDestinationGroup({ badge: "東歐", region: "布拉格 Prague" }), "歐洲");
  assert.equal(tripDestinationGroup({ badge: "海島", region: "帛琉" }), "東南亞・海島");
  assert.equal(tripDestinationGroup({ badge: "中東非洲", region: "土耳其" }), "中東・非洲");
  // 地區文字看不出國家，分類有填就不會掉到「其他」。
  assert.equal(tripDestinationGroup({ badge: "日本", region: "賞楓秘境" }), "日本");
  // 地區寫了港口名的郵輪，照分類算郵輪，不算日本。
  assert.equal(tripDestinationGroup({ badge: "郵輪", region: "沖繩・石垣島" }), "郵輪");
  // 分類沒填、或是沒見過的新分類：退回用地名判斷。
  assert.equal(tripDestinationGroup({ badge: "", region: "首爾" }), "韓國");
  assert.equal(tripDestinationGroup({ badge: "季節限定", region: "北海道" }), "日本");
  assert.equal(tripDestinationGroup({ badge: "季節限定", region: "火星" }), "其他");

  const cruise = structuredClone(base); cruise.id = "cruise"; cruise.badge = "郵輪"; cruise.region = "沖繩・石垣島";
  const options = destinationOptions(finderTrips([cruise], today), "group", today);
  assert.deepEqual(options.map((option) => option.group), ["郵輪"]);
});
