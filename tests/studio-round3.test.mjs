import assert from "node:assert/strict";
import test from "node:test";
import {
  adjustDeparturePrices,
  countExpiredDepartures,
  isExpiredDeparture,
  removeExpiredDepartures,
  sortDeparturesByDate,
  upcomingMonthCounts,
} from "../lib/departure-tools.ts";
import { describeRestore, summarizeContentRestore } from "../lib/content-diff.ts";
import { isContentHistoryKey, isContactRequestKey } from "../lib/storage-keys.ts";
import {
  checkPasswordRecord,
  createPasswordRecord,
  parsePasswordRecord,
  passwordRecordKey,
  validateNewPassword,
} from "../lib/studio-passwords.ts";

const today = Date.UTC(2026, 9, 3); // 2026/10/03

const trip = (overrides = {}) => ({
  id: "trip-a",
  featured: true,
  badge: "日本",
  region: "東京",
  days: "5日",
  title: "東京慢旅",
  summary: "簡介",
  price: "NT$30,000 起／人",
  image: "/trips/tokyo.jpg",
  plans: [
    { id: "p1", airline: "長榮", title: "標準", summary: "", price: "", documentType: "pdf", documentUrl: "/x.pdf", documentName: "x", departureMode: "selected", departureIds: ["old", "nov", "dec"] },
    { id: "p2", airline: "華航", title: "標準", summary: "", price: "", documentType: "pdf", documentUrl: "/y.pdf", departureMode: "all", documentName: "y", departureIds: [] },
  ],
  departures: [
    { id: "dec", date: "2026/12/01", price: "32,000" },
    { id: "old", date: "2026/09/20", price: "28,000" },
    { id: "bad", date: "明年春天", price: "30,000" },
    { id: "nov", date: "2026/11/10", price: "30,000", note: "加開" },
    { id: "today", date: "2026/10/03", price: "NT$29,000" },
    { id: "ask", date: "2026/11/17", price: "洽詢" },
  ],
  ...overrides,
});

test("only valid past dates count as expired; today and typos do not", () => {
  const t = trip();
  assert.equal(isExpiredDeparture({ date: "2026/09/20" }, today), true);
  assert.equal(isExpiredDeparture({ date: "2026/10/03" }, today), false);
  assert.equal(isExpiredDeparture({ date: "明年春天" }, today), false);
  assert.equal(countExpiredDepartures(t, today), 1);
});

test("clearing expired dates also drops them from each version's list and never mutates the input", () => {
  const original = trip();
  const before = JSON.stringify(original);
  const { trip: cleaned, removed } = removeExpiredDepartures(original, today);
  assert.equal(removed, 1);
  assert.deepEqual(cleaned.departures.map((d) => d.id), ["dec", "bad", "nov", "today", "ask"]);
  assert.deepEqual(cleaned.plans[0].departureIds, ["nov", "dec"]);
  assert.equal(cleaned.plans[1].departureMode, "all");
  assert.equal(JSON.stringify(original), before);

  const nothing = removeExpiredDepartures(cleaned, today);
  assert.equal(nothing.removed, 0);
  assert.equal(nothing.trip, cleaned);
});

test("sorting puts dates in order, keeps same-day rows stable and leaves typos last", () => {
  const sorted = sortDeparturesByDate(trip());
  assert.deepEqual(sorted.departures.map((d) => d.id), ["old", "today", "nov", "ask", "dec", "bad"]);
  const ordered = sortDeparturesByDate(sorted);
  assert.equal(ordered, sorted);

  const sameDay = trip({ departures: [{ id: "b", date: "2026/11/01", price: "1" }, { id: "a", date: "2026/11/01", price: "2" }] });
  assert.deepEqual(sortDeparturesByDate(sameDay).departures.map((d) => d.id), ["b", "a"]);
});

test("month list covers only upcoming dates, oldest first", () => {
  assert.deepEqual(upcomingMonthCounts(trip(), today), [["2026/10", 1], ["2026/11", 2], ["2026/12", 1]]);
});

test("price adjustment touches only upcoming dates in scope and reports what it skipped", () => {
  const original = trip();
  const before = JSON.stringify(original);

  const add = adjustDeparturePrices(original, { scope: "all", mode: "add", amount: 2000 }, today);
  const prices = Object.fromEntries(add.trip.departures.map((d) => [d.id, d.price]));
  assert.equal(prices.old, "28,000"); // 已過期：不動
  assert.equal(prices.bad, "30,000"); // 日期無效：不動
  assert.equal(prices.dec, "34,000");
  assert.equal(prices.nov, "32,000");
  assert.equal(prices.today, "31,000"); // 原本是 NT$29,000，統一成純數字格式
  assert.equal(prices.ask, "洽詢"); // 不是數字：略過
  assert.equal(add.changed, 3);
  assert.equal(add.skipped, 1);
  assert.deepEqual(add.example, { date: "2026/12/01", from: "32,000", to: "34,000" });
  assert.equal(JSON.stringify(original), before);

  const november = adjustDeparturePrices(original, { scope: "2026/11", mode: "subtract", amount: 1000 }, today);
  assert.equal(november.trip.departures.find((d) => d.id === "nov").price, "29,000");
  assert.equal(november.trip.departures.find((d) => d.id === "dec").price, "32,000");
  assert.equal(november.changed, 1);
});

test("setting a fixed price also fills in missing prices; impossible results are skipped", () => {
  const set = adjustDeparturePrices(trip(), { scope: "all", mode: "set", amount: 35900 }, today);
  assert.equal(set.trip.departures.find((d) => d.id === "ask").price, "35,900");
  assert.equal(set.trip.departures.find((d) => d.id === "old").price, "28,000");
  assert.equal(set.changed, 4);

  // 12/01 的 32,000 減 31,000 仍是 1,000；其餘會變成負數或本來就不是數字，一律略過
  const tooMuch = adjustDeparturePrices(trip(), { scope: "all", mode: "subtract", amount: 31000 }, today);
  assert.equal(tooMuch.changed, 1);
  assert.equal(tooMuch.skipped, 3);
  assert.equal(tooMuch.trip.departures.find((d) => d.id === "nov").price, "30,000");
});

test("invalid amounts change nothing", () => {
  for (const amount of [0, -5, 1.5, Number.NaN, 10_000_000]) {
    const result = adjustDeparturePrices(trip(), { scope: "all", mode: "add", amount }, today);
    assert.equal(result.changed, 0);
  }
});

// ---------- 還原先前的版本 ----------

const site = (trips, overrides = {}) => ({
  brandName: "找到了旅行社",
  announcement: "公告",
  heroTitle: "標題",
  trips,
  ...overrides,
});
const t = (id, title, extra = {}) => ({ id, title, price: "NT$1 起", departures: [], plans: [], ...extra });

test("restore summary lists added, removed, changed and reordered trips in plain terms", () => {
  const current = site([t("a", "東京"), t("b", "釜山"), t("c", "首爾", { price: "NT$9 起" })]);
  const snapshot = site([t("c", "首爾"), t("a", "東京"), t("d", "濟州")]);
  const summary = summarizeContentRestore(current, snapshot);
  assert.deepEqual(summary.added, ["濟州"]);
  assert.deepEqual(summary.removed, ["釜山"]);
  assert.deepEqual(summary.changed, ["首爾"]);
  assert.equal(summary.reordered, true);
  assert.equal(summary.settingsChanged, false);
  assert.equal(summary.unchanged, false);
  const lines = describeRestore(summary);
  assert.ok(lines.some((line) => line.includes("會多回 1 個行程") && line.includes("濟州")));
  assert.ok(lines.some((line) => line.includes("會少掉 1 個行程") && line.includes("釜山")));
  assert.ok(lines.some((line) => line.includes("內容會換回舊的") && line.includes("首爾")));
});

test("restore summary notices site-wide settings and recognises an identical version", () => {
  const trips = [t("a", "東京")];
  const same = summarizeContentRestore(site(trips), site(trips));
  assert.equal(same.unchanged, true);
  assert.match(describeRestore(same)[0], /一樣/);

  const settings = summarizeContentRestore(site(trips), site(trips, { announcement: "舊公告" }));
  assert.equal(settings.settingsChanged, true);
  assert.equal(settings.unchanged, false);
  assert.ok(describeRestore(settings).some((line) => line.includes("網站設定")));
});

test("long trip lists are shortened in the summary", () => {
  const many = Array.from({ length: 7 }, (_, i) => t(`x${i}`, `行程${i}`));
  const [line] = describeRestore(summarizeContentRestore(site([]), site(many)));
  assert.match(line, /會多回 7 個行程/);
  assert.match(line, /等 7 個/);
});

test("history keys accept only generated snapshot paths", () => {
  const uuid = "123e4567-e89b-12d3-a456-426614174000";
  assert.equal(isContentHistoryKey(`content-history/1760000000000-${uuid}.json`), true);
  for (const value of [
    `content-history/../content/site-content.json`,
    `content-history/1760000000000-${uuid}.html`,
    `contact-requests/1760000000000-${uuid}.json`,
    "content-history/abc.json",
    null,
  ]) {
    assert.equal(isContentHistoryKey(value), false, String(value));
  }
  assert.equal(isContactRequestKey(`content-history/1760000000000-${uuid}.json`), false);
});

// ---------- 業務自己改密碼 ----------

test("a self-set password is stored hashed and verified; the old env password no longer counts", async () => {
  const record = await createPasswordRecord("新的好記密碼 2026", "env-password-1", new Date("2026-10-03T08:00:00Z"));
  assert.equal(record.changedAt, "2026-10-03T08:00:00.000Z");
  assert.ok(!JSON.stringify(record).includes("新的好記密碼"));
  assert.ok(!JSON.stringify(record).includes("env-password-1"));
  assert.deepEqual(parsePasswordRecord(JSON.parse(JSON.stringify(record))), record);

  assert.equal(await checkPasswordRecord(record, "新的好記密碼 2026", "env-password-1"), "ok");
  assert.equal(await checkPasswordRecord(record, "新的好記密碼 2027", "env-password-1"), "wrong");
  assert.equal(await checkPasswordRecord(record, "env-password-1", "env-password-1"), "wrong");
});

test("when the admin resets the env password, the self-set password is voided", async () => {
  const record = await createPasswordRecord("新的好記密碼 2026", "env-password-1");
  assert.equal(await checkPasswordRecord(record, "新的好記密碼 2026", "env-password-2"), "void");
  assert.equal(await checkPasswordRecord(record, "env-password-2", "env-password-2"), "void");
});

test("two records for the same password never share salt or hash", async () => {
  const a = await createPasswordRecord("同一個密碼 12345", "env");
  const b = await createPasswordRecord("同一個密碼 12345", "env");
  assert.notEqual(a.salt, b.salt);
  assert.notEqual(a.hash, b.hash);
});

test("malformed stored records are ignored rather than trusted", () => {
  for (const value of [null, "x", {}, { v: 2 }, { v: 1, salt: "AA==", hash: "AA==", baseSalt: "AA==", baseHash: "AA==", changedAt: "x" }]) {
    assert.equal(parsePasswordRecord(value), null);
  }
});

test("password record keys are stable per account, case-insensitive and never contain the address", () => {
  const key = passwordRecordKey("Amy@Example.com");
  assert.equal(key, passwordRecordKey(" amy@example.com "));
  assert.notEqual(key, passwordRecordKey("bob@example.com"));
  assert.match(key, /^studio-passwords\/[0-9a-f]{64}\.json$/);
  assert.ok(!key.includes("amy"));
});

test("new password rules: length, difference from the current one, no surrounding spaces", () => {
  assert.equal(validateNewPassword("abcdefghij", "oldpassword"), null);
  assert.match(validateNewPassword("short", "oldpassword"), /至少/);
  assert.match(validateNewPassword("x".repeat(129), "oldpassword"), /最多/);
  assert.match(validateNewPassword("oldpassword", "oldpassword"), /不能和目前/);
  assert.match(validateNewPassword(" abcdefghij", "oldpassword"), /空白/);
  assert.match(validateNewPassword(undefined, "oldpassword"), /請輸入/);
});
