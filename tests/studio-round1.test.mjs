import assert from "node:assert/strict";
import test from "node:test";
import {
  applyContactHandling,
  contactHandlingBatchLimit,
  countContactHandling,
  handlerLabel,
  isContactHandlingState,
  parseContactHandling,
} from "../lib/contact-handling.ts";
import { firstUnfinishedTrip, tripDraftProblems } from "../lib/trip-validation.ts";

const request = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "王小明",
  mobile: "0912345678",
  preferredTimes: ["anytime"],
  message: "想問東京",
  createdAt: "2026-10-02T03:00:00.000Z",
  notification: { state: "delivered", attempts: 1, nextAttemptAt: 0, line: true, webhook: false },
};

test("marking a request contacted records who and when, and keeps the notification state", () => {
  const now = new Date("2026-10-03T06:30:00.000Z");
  const contacted = applyContactHandling(request, "contacted", "amy@example.com", now);
  assert.deepEqual(contacted.handling, { by: "amy@example.com", at: "2026-10-03T06:30:00.000Z" });
  assert.equal(contacted.notification.state, "delivered");
  assert.equal(request.handling, undefined, "the original object is not mutated");
});

test("returning a request to pending removes the handling record", () => {
  const contacted = applyContactHandling(request, "contacted", "amy@example.com");
  const pending = applyContactHandling(contacted, "new", "bob@example.com");
  assert.equal("handling" in pending, false);
});

test("stored handling is validated and counted", () => {
  assert.equal(parseContactHandling(undefined), undefined);
  assert.equal(parseContactHandling({ by: "a@b.c", at: "not a date" }), undefined);
  assert.deepEqual(parseContactHandling({ by: "a@b.c", at: "2026-10-03T00:00:00.000Z" }), { by: "a@b.c", at: "2026-10-03T00:00:00.000Z" });
  assert.deepEqual(countContactHandling([{}, { handling: { by: "x", at: "2026-10-03T00:00:00.000Z" } }, {}]), { pending: 2, contacted: 1 });
  assert.equal(isContactHandlingState("contacted"), true);
  assert.equal(isContactHandlingState("deleted"), false);
  assert.equal(handlerLabel("amy@example.com"), "amy");
  assert.equal(handlerLabel(""), "同事");
  assert.ok(contactHandlingBatchLimit >= 300, "bulk marking covers the 300 requests the list shows");
});

const finished = {
  id: "trip-1",
  title: "東京慢旅 5日",
  days: "5日",
  badge: "日本",
  region: "東京・箱根",
  image: "https://images.unsplash.com/photo-1",
  summary: "住進喜歡的街區。",
  plans: [{ airline: "長榮航空", title: "早去晚回" }],
};

test("a fully filled trip has no problems", () => {
  assert.deepEqual(tripDraftProblems(finished), []);
  assert.equal(firstUnfinishedTrip({ trips: [finished] }), null);
});

test("blank and leftover placeholder values are reported by field name", () => {
  const fresh = { ...finished, title: "", days: "", badge: "", region: "", image: "", summary: "", plans: [{ airline: "", title: "" }] };
  assert.deepEqual(tripDraftProblems(fresh), ["行程名稱", "天數", "分類標籤", "地區小字", "封面圖片", "行程簡介", "航空公司與版本名稱"]);
  const legacy = { ...finished, title: "新行程", region: "DESTINATION", plans: [{ airline: "航空公司待填", title: "新行程版本" }] };
  assert.deepEqual(tripDraftProblems(legacy), ["行程名稱", "地區小字", "航空公司與版本名稱"]);
});

test("the first unfinished trip is located so the editor can open and scroll to it", () => {
  const found = firstUnfinishedTrip({ trips: [finished, { ...finished, id: "trip-2", title: "", image: "" }] });
  assert.equal(found?.id, "trip-2");
  assert.equal(found?.index, 1);
  assert.match(found?.message ?? "", /第 2 筆行程/);
  assert.match(found?.message ?? "", /行程名稱、封面圖片/);
  const named = firstUnfinishedTrip({ trips: [{ ...finished, summary: "" }] });
  assert.match(named?.message ?? "", /「東京慢旅 5日」/);
});
