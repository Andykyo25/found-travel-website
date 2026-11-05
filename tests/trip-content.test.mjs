import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { defaultSiteContent, normalizeSiteContent } from "../lib/site-content.ts";
import { faqJsonLd, tripJsonLd } from "../lib/structured-data.ts";
import { departureRows } from "../lib/trip-filters.ts";
import { listLines, parseItineraryText } from "../lib/trip-itinerary.ts";
import { validateContentDraft, validateTripSlugs } from "../lib/trip-validation.ts";
import { cleanTripSlug, findTripByPathKey, tripPath, typingTripSlug } from "../lib/trip-values.ts";

const origin = "https://www.example.com.tw";
const baseTrip = defaultSiteContent.trips[0];

test("trip URLs use the English slug when there is one and keep old IDs working", () => {
  const trips = [
    { id: "528876d5-016b-4866", slug: "norway-lofoten-aurora-15d" },
    { id: "tokyo-slow" },
  ];
  assert.equal(tripPath(trips[0]), "/trips/norway-lofoten-aurora-15d");
  assert.equal(tripPath(trips[1]), "/trips/tokyo-slow");
  assert.equal(findTripByPathKey(trips, "norway-lofoten-aurora-15d"), trips[0]);
  // 分享出去的舊連結（行程 ID）仍找得到同一個行程，頁面再轉到代稱網址。
  assert.equal(findTripByPathKey(trips, "528876d5-016b-4866"), trips[0]);
  assert.equal(findTripByPathKey(trips, "missing"), undefined);
});

test("slugs are typed freely but saved clean", () => {
  assert.equal(typingTripSlug("Hokkaido Ice_breaker-"), "hokkaido-ice-breaker-");
  assert.equal(typingTripSlug("北海道 6日"), "-6");
  assert.equal(cleanTripSlug(" -Hokkaido--6D- "), "hokkaido-6d");
  assert.equal(cleanTripSlug("北海道"), "");
});

test("slug validation blocks duplicates, unusable text and collisions with trip IDs", () => {
  const draft = (slugs) => ({ trips: slugs.map((slug, index) => ({ id: `id-${index}`, title: `行程${index}`, slug })) });
  assert.equal(validateTripSlugs(draft(["a-trip", "", "b-trip"])), null);
  assert.match(validateTripSlugs(draft(["same", "same"])), /行程0.*行程1.*same/);
  assert.match(validateTripSlugs(draft(["北海道"])), /只能用英文/);
  assert.match(validateTripSlugs(draft(["id-1", ""])), /系統編號/);
  // 完整檢查依序：團期 → 代稱 → 聯絡資訊。
  assert.match(validateContentDraft({ ...draft(["x", "x"]), trips: draft(["x", "x"]).trips.map((trip) => ({ ...trip, departures: [] })) }), /代稱/);
});

test("saved trips keep slugs, itinerary, costs and FAQs, and old trips stay unchanged", () => {
  const saved = normalizeSiteContent({
    ...defaultSiteContent,
    trips: [
      {
        ...baseTrip,
        slug: "Tokyo Slow-5D-",
        itinerary: [
          { id: "d1", title: "台北→東京", description: "抵達後入住", meals: "晚餐 自理", hotel: "新宿王子" },
          { id: "d1", title: "", description: "" },
          { title: "箱根", description: "", meals: "", hotel: "" },
        ],
        includes: " 機票\n住宿 ",
        faqs: [
          { id: "q", question: "幾月去最好？", answer: "4 月賞櫻。" },
          { id: "q2", question: "只有問題", answer: "" },
        ],
      },
      { ...baseTrip, id: "dup", slug: "tokyo-slow-5d" },
      { ...defaultSiteContent.trips[1] },
    ],
  });
  const [first, duplicate, untouched] = saved.trips;
  assert.equal(first.slug, "tokyo-slow-5d");
  assert.equal(duplicate.slug, "tokyo-slow-5d-2");
  assert.deepEqual(first.itinerary.map((day) => [day.id, day.title]), [["d1", "台北→東京"], ["day-3", "箱根"]]);
  assert.equal(first.includes, "機票\n住宿");
  assert.deepEqual(first.faqs.map((faq) => faq.question), ["幾月去最好？"]);
  // 沒填代稱的舊行程會自動產生代稱，其他新欄位不會憑空出現。
  assert.equal(untouched.slug, "hokkaido-flower-fields-7d");
  for (const key of ["slugManual", "previousSlugs", "itinerary", "includes", "excludes", "notes", "faqs"]) {
    assert.equal(key in untouched, false, `${key} should not be added to trips without it`);
  }
});

test("a pasted PDF itinerary is split into days with meals and hotels", () => {
  const days = parseItineraryText(`北海道破冰船6日
★ 行程特色（這段在第一天之前，會略過）
第1天 台北／新千歲機場→札幌
搭乘直飛班機前往北海道。
早餐：— 午餐：機上 晚餐：螃蟹吃到飽
住宿：札幌京王廣場酒店或同級
DAY 2：小樽運河．北一硝子
漫步小樽運河
宿泊：小樽 NOT A HOTEL
D3
網走流冰破冰船
第 四 日 回程`);
  assert.deepEqual(days, [
    { title: "台北／新千歲機場→札幌", description: "搭乘直飛班機前往北海道。", meals: "早餐：— 午餐：機上 晚餐：螃蟹吃到飽", hotel: "札幌京王廣場酒店或同級" },
    { title: "小樽運河．北一硝子", description: "漫步小樽運河", meals: "", hotel: "小樽 NOT A HOTEL" },
    { title: "網走流冰破冰船", description: "", meals: "", hotel: "" },
    { title: "回程", description: "", meals: "", hotel: "" },
  ]);
  assert.deepEqual(parseItineraryText("沒有任何天數標記的文字\nDior 專櫃"), []);
  assert.deepEqual(listLines("• 機票\n・ 住宿\n- 保險\n\n※ 小費"), ["機票", "住宿", "保險", "小費"]);
});

test("trip structured data lists each day and uses the slug URL; FAQs become a FAQPage", () => {
  const trip = {
    ...baseTrip,
    slug: "tokyo-slow-5d",
    itinerary: [
      { id: "a", title: "台北→東京", description: "抵達", meals: "", hotel: "" },
      { id: "b", title: "", description: "自由活動", meals: "", hotel: "" },
    ],
  };
  const data = tripJsonLd(trip, defaultSiteContent, origin, Date.UTC(2026, 10, 5));
  assert.equal(data.url, `${origin}/trips/tokyo-slow-5d`);
  assert.deepEqual(
    data.itinerary.itemListElement.map((item) => [item.position, item.name]),
    [[1, "第 1 天：台北→東京"], [2, "第 2 天"]],
  );
  const faq = faqJsonLd([{ question: "幾月去最好？", answer: "4 月。" }], data.url);
  assert.equal(faq["@type"], "FAQPage");
  assert.equal(faq.mainEntity[0].acceptedAnswer.text, "4 月。");
});

test("every public link to a trip goes through tripPath, and old /dates/<id> links redirect", async () => {
  const rows = departureRows([{ ...baseTrip, slug: "tokyo-slow-5d", departures: [{ id: "d", date: "2027/01/01", price: "1000" }] }]);
  assert.equal(rows[0].tripPath, "/trips/tokyo-slow-5d");

  const files = await Promise.all(
    [
      "../app/components/PackageCard.tsx",
      "../app/components/JourneyAtlas.tsx",
      "../app/components/DepartureBoard.tsx",
      "../app/components/TravelFinder.tsx",
      "../app/sitemap.ts",
      "../app/dates/[tripId]/page.tsx",
      "../app/trips/[slug]/page.tsx",
      "../next.config.ts",
    ].map((file) => readFile(new URL(file, import.meta.url), "utf8")),
  );
  for (const source of files.slice(0, 5)) assert.doesNotMatch(source, /\/dates\/\$\{/);
  assert.match(files[5], /permanentRedirect\(tripPath\(trip\)\)/);
  assert.match(files[6], /permanentRedirect\(tripPath\(trip\)\)/);
  assert.match(files[6], /<TripItinerary trip=\{trip\} \/>/);
  assert.match(files[6], /<TripNotes trip=\{trip\} \/>/);
  assert.match(files[7], /"\/trips\/:path\*"/);
});
