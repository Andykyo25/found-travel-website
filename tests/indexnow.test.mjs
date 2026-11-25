import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { changedPaths, indexNowKey } from "../lib/indexnow.ts";

const trip = (id, patch = {}) => ({ id, slug: id, badge: "日本", title: id, ...patch });

test("the IndexNow key file is published with the key as its only content", async () => {
  const body = await readFile(new URL(`../public/${indexNowKey}.txt`, import.meta.url), "utf8");
  assert.equal(body.trim(), indexNowKey);
});

test("only trips that changed are announced, with the pages that list them", () => {
  const before = [trip("a"), trip("b")];
  assert.deepEqual(changedPaths(before, before.map((t) => ({ ...t }))), []);

  const paths = changedPaths(before, [trip("a"), trip("b", { title: "新標題" })]);
  assert.deepEqual(paths.sort(), ["/", "/dates", "/destinations/japan", "/trips/b"].sort());
  assert.ok(!paths.includes("/trips/a"));
});

test("added, removed, renamed and moved trips all announce both old and new URLs", () => {
  const before = [trip("a"), trip("b"), trip("c")];
  const after = [trip("a", { slug: "a-new" }), trip("b", { badge: "韓國" }), trip("d")];
  const paths = changedPaths(before, after);
  for (const path of ["/trips/a", "/trips/a-new", "/trips/c", "/trips/d", "/destinations/japan", "/destinations/korea"]) {
    assert.ok(paths.includes(path), path);
  }
});

test("saving content and importing trips both notify search engines", async () => {
  for (const file of ["../app/api/studio/content/route.ts", "../app/api/studio/import/route.ts"]) {
    assert.match(await readFile(new URL(file, import.meta.url), "utf8"), /notifyChangedTrips\(/, file);
  }
  const notify = await readFile(new URL("../lib/indexnow-notify.ts", import.meta.url), "utf8");
  assert.match(notify, /isTemporaryHost/);
  assert.match(notify, /after\(/);
});
