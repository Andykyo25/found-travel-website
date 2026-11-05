import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { defaultSiteContent, normalizeSiteContent } from "../lib/site-content.ts";
import { carryPreviousSlugs, suggestTripSlug, tripDaysToken, uniqueTripSlug } from "../lib/trip-slug.ts";
import { findTripByPathKey } from "../lib/trip-values.ts";

test("Chinese trip names become readable English slugs", () => {
  const cases = [
    [{ title: "北海道破冰船+玩雪6日" }, "hokkaido-icebreaker-snow-6d"],
    [{ title: "挪威羅弗敦群島極光15天" }, "norway-lofoten-aurora-15d"],
    [{ title: "釜慶邱五日" }, "busan-gyeongju-daegu-5d"],
    [{ title: "首爾絕美賞楓五日" }, "seoul-autumn-foliage-5d"],
    [{ title: "首爾超殺特惠五日" }, "seoul-value-5d"],
    [{ title: "豪華直飛奧捷10日 星宇布拉格" }, "czech-austria-prague-luxury-10d"],
    // 名稱沒寫天數時用天數欄位。
    [{ title: "北海道青池點燈雙溫泉", days: "6日" }, "hokkaido-blue-pond-illumination-onsen-6d"],
    // 名稱沒有地名時參考地區欄位。
    [{ title: "療癒慢旅 6日", region: "峇里島" }, "bali-slow-travel-6d"],
    // 對照表沒有的字，退而使用原本就有的英文。
    [{ title: "神秘之旅", region: "布拉格 Prague" }, "prague"],
    [{ title: "神秘之旅", region: "未知" }, ""],
  ];
  for (const [trip, expected] of cases) assert.equal(suggestTripSlug(trip), expected, trip.title);
});

test("day counts are read from Arabic and Chinese numerals", () => {
  assert.equal(tripDaysToken("五日遊"), "5d");
  assert.equal(tripDaysToken("十日"), "10d");
  assert.equal(tripDaysToken("十五天"), "15d");
  assert.equal(tripDaysToken("二十一日"), "21d");
  assert.equal(tripDaysToken("日本之旅", "7日"), "7d");
  assert.equal(tripDaysToken("日本之旅"), "");
});

test("duplicate slugs get a numbered suffix", () => {
  assert.equal(uniqueTripSlug("seoul-5d", ["seoul-5d", "seoul-5d-2"]), "seoul-5d-3");
  assert.equal(uniqueTripSlug("", ["x"]), "");
});

test("trips without a slug get one automatically; manual slugs stay as typed", () => {
  const saved = normalizeSiteContent({
    ...defaultSiteContent,
    trips: [
      { ...defaultSiteContent.trips[0], id: "a", title: "首爾滑雪五日", slug: "" },
      { ...defaultSiteContent.trips[0], id: "b", title: "首爾滑雪五日" },
      { ...defaultSiteContent.trips[0], id: "c", title: "首爾滑雪五日", slug: "my-own-slug", slugManual: true },
      { ...defaultSiteContent.trips[0], id: "d", title: "神秘之旅", region: "未知", days: "" },
    ],
  });
  assert.deepEqual(
    saved.trips.map((trip) => [trip.slug, trip.slugManual ?? false]),
    [
      ["seoul-ski-5d", false],
      ["seoul-ski-5d-2", false],
      ["my-own-slug", true],
      [undefined, false],
    ],
  );
});

test("a changed slug is remembered so old links still find the trip", () => {
  const before = normalizeSiteContent({
    ...defaultSiteContent,
    trips: [{ ...defaultSiteContent.trips[0], id: "a", title: "首爾滑雪五日" }],
  });
  const renamed = normalizeSiteContent({
    ...defaultSiteContent,
    trips: [{ ...before.trips[0], title: "首爾賞楓五日", slug: "seoul-autumn-foliage-5d" }],
  });
  const saved = carryPreviousSlugs(renamed, before);
  assert.equal(saved.trips[0].slug, "seoul-autumn-foliage-5d");
  assert.deepEqual(saved.trips[0].previousSlugs, ["seoul-ski-5d"]);
  // 再改回原本的代稱：目前代稱不會出現在舊代稱清單裡。
  const back = carryPreviousSlugs(
    normalizeSiteContent({ ...defaultSiteContent, trips: [{ ...saved.trips[0], slug: "seoul-ski-5d" }] }),
    saved,
  );
  assert.deepEqual(back.trips[0].previousSlugs, ["seoul-autumn-foliage-5d"]);
  // 舊代稱、行程 ID、目前代稱都找得到；目前代稱優先於別的行程的舊代稱。
  const trips = [saved.trips[0], { id: "b", slug: "seoul-ski-5d-new" }];
  assert.equal(findTripByPathKey(trips, "seoul-ski-5d"), saved.trips[0]);
  assert.equal(findTripByPathKey(trips, "a"), saved.trips[0]);
  assert.equal(findTripByPathKey([...trips, { id: "c", slug: "seoul-ski-5d" }], "seoul-ski-5d").id, "c");
});

test("saving records slug history and the editor follows the name until a slug is typed", async () => {
  const [content, editor] = await Promise.all(
    ["../lib/site-content.ts", "../app/components/TripsEditor.tsx"].map((file) =>
      readFile(new URL(file, import.meta.url), "utf8"),
    ),
  );
  assert.match(content, /carryPreviousSlugs\(\s*normalizeSiteContent\(value\)/);
  assert.match(editor, /trip\.slugManual \? change : \{ \.\.\.change, slug: autoTripSlug/);
  assert.match(editor, /slug \? \{ slug, slugManual: true \} : \{ slug: "", slugManual: false \}/);
  assert.match(editor, /改回自動產生/);
});
