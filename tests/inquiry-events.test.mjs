import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { inquiryEventKey, inquirySinceDate, isInquiryKind, lineMessageUrl, normalizeInquiryPath, parseInquiryEventKey, summarizeInquiryEvents } from "../lib/inquiry-events.ts";
import { lineAccountIdFromUrl } from "../lib/line-account.ts";

const id = "123e4567-e89b-42d3-a456-426614174000";

test("only public pages are counted, without query strings", () => {
  assert.equal(normalizeInquiryPath("/"), "/");
  assert.equal(normalizeInquiryPath("/trips/busan-value-6d?utm=x#plans"), "/trips/busan-value-6d");
  assert.equal(normalizeInquiryPath("/news/korea-k-eta-2027/"), "/news/korea-k-eta-2027");
  assert.equal(normalizeInquiryPath("/dates/month/2027-02"), "/dates/month/2027-02");
  for (const bad of ["/studio", "/studio/contacts", "/api/contact", "/trips/a/b", "https://evil.example/", "", 42, "/" + "x".repeat(200)]) {
    assert.equal(normalizeInquiryPath(bad), null, String(bad));
  }
  assert.ok(isInquiryKind("line") && isInquiryKind("form") && !isInquiryKind("view"));
});

test("event keys carry the date, kind and page so stats need only a listing", () => {
  const key = inquiryEventKey("2026-11-26", "line", "/trips/釜山-6d", 1795658604170, id);
  assert.match(key, /^inquiry-events\/2026-11-26\/line\/[A-Za-z0-9_-]+\/1795658604170-/);
  assert.deepEqual(parseInquiryEventKey(key), { date: "2026-11-26", kind: "line", path: "/trips/釜山-6d" });
  assert.equal(parseInquiryEventKey("inquiry-events/2026-11-26/line/xx"), null);
  assert.equal(parseInquiryEventKey(inquiryEventKey("2026-11-26", "line", "/studio", 1795658604170, id)), null);
});

test("stats add up by page, busiest first", () => {
  const keys = [
    inquiryEventKey("2026-11-25", "line", "/trips/a", 1795658604170, id),
    inquiryEventKey("2026-11-25", "line", "/trips/a", 1795658604171, id),
    inquiryEventKey("2026-11-26", "form", "/trips/a", 1795658604172, id),
    inquiryEventKey("2026-11-26", "line", "/", 1795658604173, id),
    "inquiry-events/garbage",
  ];
  const { totals, rows } = summarizeInquiryEvents(keys);
  assert.deepEqual(totals, { line: 3, form: 1 });
  assert.deepEqual(rows, [{ path: "/trips/a", line: 2, form: 1 }, { path: "/", line: 1, form: 0 }]);
  assert.equal(inquirySinceDate(30, new Date("2026-11-26T03:00:00Z")), "2026-10-28");
});

test("the LINE link opens the official account chat with the trip filled in", () => {
  assert.equal(lineAccountIdFromUrl("https://line.me/R/ti/p/@286jwluk?ts=09081203&oat_content=url"), "@286jwluk");
  assert.equal(lineAccountIdFromUrl("https://lin.ee/BWlEE6JZ"), null);
  assert.equal(lineMessageUrl("@286jwluk", "你好 A&B"), "https://line.me/R/oaMessage/%40286jwluk/?%E4%BD%A0%E5%A5%BD%20A%26B");
});

test("trip pages, the tracker and the form are wired up", async () => {
  const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
  const [trip, tracker, form, layout, route] = await Promise.all([
    read("../app/trips/[slug]/page.tsx"),
    read("../app/components/InquiryTracker.tsx"),
    read("../app/components/ContactForm.tsx"),
    read("../app/layout.tsx"),
    read("../app/api/inquiry-events/route.ts"),
  ]);
  assert.match(trip, /data-line-message/);
  assert.match(trip, /prefill=\{linePrefill\}/);
  // 電腦版 LINE 不支援預填訊息連結，只在手機改。
  assert.match(tracker, /isPhone\(\)/);
  // LINE 社群的邀請連結（line.me/ti/g2）不算詢問。
  assert.doesNotMatch(tracker, /ti\/g2/);
  assert.match(form, /recordInquiry\("form", source\)/);
  assert.match(layout, /<InquiryTracker \/>/);
  assert.match(route, /isSameOriginRequest/);
  assert.match(route, /normalizeInquiryPath/);
});
