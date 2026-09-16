import assert from "node:assert/strict";
import test from "node:test";
import { emptyNeeds, findTravel, validateNeeds, needsSummary } from "../lib/travel-finder.ts";
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
  ["unknown price basis excluded", { budget: "50000" }, t => { delete t.plans[0].priceBasis; return t; }, 0],
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
  const result = search({ airport: "桃園", budget: "50000" }, trip);
  assert.equal(result.candidates.length, 0); assert.equal(result.pendingCandidates.length, 1);
  const c = result.pendingCandidates[0];
  assert.equal(c.needsConfirmation, true);
  assert.match(c.pending.join(" "), /價格.*待確認/);
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