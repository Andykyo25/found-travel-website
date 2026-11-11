import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { defaultSiteContent, normalizeSiteContent } from "../lib/site-content.ts";
import { alternateSiteHost, exactHostPattern, railwayHostPattern } from "../lib/site-origin.ts";
import {
  agencyId,
  breadcrumbJsonLd,
  postalAddress,
  serializeJsonLd,
  telephoneHref,
  travelAgencyJsonLd,
  tripJsonLd,
} from "../lib/structured-data.ts";
import { validateContactInfo } from "../lib/trip-validation.ts";

const origin = "https://www.example.com.tw";
const today = Date.UTC(2026, 10, 5);

test("the travel agency entity carries address parts, licences and only the contact details that exist", () => {
  const agency = travelAgencyJsonLd(defaultSiteContent, origin);
  assert.equal(agency["@type"], "TravelAgency");
  assert.equal(agency["@id"], `${origin}/#organization`);
  assert.equal(agency.name, "找到了旅行社股份有限公司");
  assert.deepEqual(agency.alternateName, ["找到了旅行社", "FOUND TRAVEL"]);
  assert.deepEqual(agency.address, {
    "@type": "PostalAddress",
    addressRegion: "台北市",
    addressLocality: "內湖區",
    streetAddress: "內湖路一段120巷15弄25號3樓",
    addressCountry: "TW",
  });
  assert.equal(agency.hasCredential.length, 2);
  assert.match(agency.hasMap, /google\.com\/maps/);
  // 沒填電話與 Email 時，序列化後不能出現這兩個欄位（不放空字串、不猜）。
  const json = JSON.parse(serializeJsonLd(agency));
  assert.equal("telephone" in json, false);
  assert.equal("email" in json, false);

  const withPhone = JSON.parse(
    serializeJsonLd(
      travelAgencyJsonLd({ ...defaultSiteContent, telephone: "02-2345-6789", email: "hi@example.com" }, origin),
    ),
  );
  assert.equal(withPhone.telephone, "02-2345-6789");
  assert.equal(withPhone.contactPoint.telephone, "02-2345-6789");
  assert.equal(withPhone.email, "hi@example.com");
});

test("addresses that cannot be split stay whole, postal codes are kept", () => {
  assert.equal(postalAddress("Somewhere 123").streetAddress, "Somewhere 123");
  assert.equal(postalAddress("114台北市內湖區內湖路一段1號").postalCode, "114");
  assert.equal(postalAddress("彰化縣員林市中山路1號").addressLocality, "員林市");
});

test("trip data uses upcoming departure prices, falls back to the start price and never invents one", () => {
  const trip = {
    id: "hokkaido",
    title: "北海道破冰船 6日",
    summary: "流冰季限定。",
    region: "北海道",
    days: "6日",
    image: "/trips/hokkaido.jpg",
    price: "NT$45,900 起",
    departures: [
      { id: "past", date: "2026/01/10", price: "NT$12,000" },
      { id: "a", date: "2027/02/01", price: "45900" },
      { id: "b", date: "2027/02/15", price: "NT$52,900（228連假）" },
      { id: "c", date: "2027/02/20", price: "" },
    ],
  };
  const data = tripJsonLd(trip, defaultSiteContent, origin, today);
  assert.equal(data["@type"], "TouristTrip");
  assert.equal(data.url, `${origin}/trips/hokkaido`);
  assert.equal(data.image, `${origin}/trips/hokkaido.jpg`);
  assert.equal(data.provider["@id"], agencyId(origin));
  assert.deepEqual(
    { type: data.offers["@type"], low: data.offers.lowPrice, high: data.offers.highPrice, count: data.offers.offerCount },
    { type: "AggregateOffer", low: 45900, high: 52900, count: 2 },
  );

  const noDates = tripJsonLd({ ...trip, departures: [] }, defaultSiteContent, origin, today);
  assert.deepEqual([noDates.offers["@type"], noDates.offers.price], ["Offer", 45900]);

  const askOnly = tripJsonLd({ ...trip, departures: [], price: "價格洽詢" }, defaultSiteContent, origin, today);
  assert.equal(askOnly.offers, undefined);

  const remote = tripJsonLd({ ...trip, image: "https://images.unsplash.com/photo-1" }, defaultSiteContent, origin, today);
  assert.equal(remote.image, "https://images.unsplash.com/photo-1");
});

test("breadcrumbs use absolute URLs without fragments", () => {
  const data = breadcrumbJsonLd(
    [
      { name: "精選行程", path: "/#journeys" },
      { name: "全部團期", path: "/dates" },
    ],
    origin,
  );
  assert.deepEqual(
    data.itemListElement.map((item) => [item.position, item.name, item.item]),
    [
      [1, "精選行程", `${origin}/`],
      [2, "全部團期", `${origin}/dates`],
    ],
  );
});

test("JSON-LD cannot close its own script tag", () => {
  const raw = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
  assert.doesNotMatch(raw, /<\/script>/i);
  assert.equal(JSON.parse(raw).name, "</script><script>alert(1)</script>");
});

test("public telephone and email are optional but must be well formed", () => {
  assert.equal(validateContactInfo({ telephone: "", email: "" }), null);
  assert.equal(validateContactInfo({ telephone: "02-2345-6789#12", email: "a@b.tw" }), null);
  assert.equal(validateContactInfo({ telephone: "(02) 2345 6789 轉 3" }), null);
  assert.equal(validateContactInfo({ telephone: "+886 2 2345 6789" }), null);
  assert.match(validateContactInfo({ telephone: "請打LINE" }), /客服電話/);
  assert.match(validateContactInfo({ telephone: "123" }), /客服電話/);
  assert.match(validateContactInfo({ email: "not-an-email" }), /Email/);

  assert.equal(telephoneHref("02-2345-6789#12"), "tel:0223456789");
  assert.equal(telephoneHref("+886 (2) 2345-6789"), "tel:+886223456789");

  const saved = normalizeSiteContent({ ...defaultSiteContent, telephone: " 02-2345-6789 ", email: "bad" });
  assert.equal(saved.telephone, "02-2345-6789");
  assert.equal(saved.email, "");
  // 舊資料沒有這兩個欄位時維持空白。
  const legacy = normalizeSiteContent({ trips: [] });
  assert.equal(legacy.telephone, "");
  assert.equal(legacy.email, "");
});

test("www and bare domains redirect to whichever one SITE_URL picks", async () => {
  assert.equal(alternateSiteHost("https://www.example.com.tw"), "example.com.tw");
  assert.equal(alternateSiteHost("https://example.com.tw"), "www.example.com.tw");
  assert.equal(exactHostPattern("www.example.com"), "www\\.example\\.com");
  const config = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");
  assert.match(config, /alternateSiteHost\(origin\)/);
  assert.match(config, /"\/find-trip"/);
  // 轉址規則在 next build 時產生；Railway 只把 Dockerfile 用 ARG 宣告的變數帶進建置。
  const dockerfile = await readFile(new URL("../Dockerfile", import.meta.url), "utf8");
  const builder = dockerfile.slice(dockerfile.indexOf("AS builder"), dockerfile.indexOf("RUN npm run build"));
  assert.match(builder, /^ARG SITE_URL$/m);
  // Railway 臨時網域用固定的樣式比對，不靠 RAILWAY_PUBLIC_DOMAIN（接上自訂網域後可能變成自訂網域）。
  const railway = new RegExp(`^${railwayHostPattern}$`);
  assert.equal(railway.test("found-travel-website-production.up.railway.app"), true);
  for (const host of ["tabiyoi.com", "www.tabiyoi.com", "a.up.railway.app.evil.com", "up.railway.app"]) {
    assert.equal(railway.test(host), false, host);
  }
  assert.doesNotMatch(config, /RAILWAY_PUBLIC_DOMAIN/);
});

test("public pages publish structured data for the agency, trips and breadcrumbs", async () => {
  const [home, trip, dates, month, article, layout] = await Promise.all(
    [
      "../app/page.tsx",
      "../app/trips/[slug]/page.tsx",
      "../app/dates/page.tsx",
      "../app/dates/month/[month]/page.tsx",
      "../app/news/[slug]/page.tsx",
      "../app/layout.tsx",
    ].map((file) => readFile(new URL(file, import.meta.url), "utf8")),
  );
  assert.match(home, /travelAgencyJsonLd\(content, origin\)/);
  // 每日行程可能來自 PDF 自動擷取，結構化資料用的是頁面上實際顯示的那一份。
  assert.match(trip, /tripJsonLd\(\{ \.\.\.trip, itinerary: itinerary\.days \}, content, origin/);
  assert.match(trip, /aria-current="page">\{trip\.title\}/);
  for (const page of [trip, dates, month, article]) assert.match(page, /breadcrumbJsonLd\(/);
  assert.match(layout, /跟團/);
});

test("trip facts give a quotable summary and answers drawn only from trip data", async () => {
  const { tripFacts } = await import("../lib/trip-facts.ts");
  const today = Date.UTC(2026, 10, 11);
  const company = { brandName: "找到了旅行社", companyName: "找到了旅行社股份有限公司", businessLicense: "交觀綜字222700號" };
  const dated = {
    title: "北海道青池點燈雙溫泉", region: "北海道", days: "6日", price: "NT$35,900 起／人", plans: [{ airline: "酷航空" }],
    departures: [
      { id: "a", date: "2026/11/01(酷航)", price: "9,900" },
      { id: "b", date: "2026/11/14(酷航)", price: "33,900", note: "額滿" },
      { id: "c", date: "2026/11/30(亞航・高雄出發)", price: "35,900", note: "已成團" },
      { id: "d", date: "2026/12/06(亞航)", price: "37,900", note: "即將額滿" },
    ],
  };
  const facts = tripFacts(dated, company, today);
  assert.equal(
    facts.summary,
    "「北海道青池點燈雙溫泉」是找到了旅行社出團的北海道 6日團體行程。截至 2026/11/11，共公布 3 個出發日（2026/11/14 至 2026/12/06），其中 2 個仍可報名，團費每人 NT$35,900 起，最近可報名的出發日是 2026/11/30。搭乘酷航、亞航。",
  );
  assert.deepEqual(Object.fromEntries(facts.items.map((item) => [item.label, item.value])), {
    行程: "北海道・6日",
    團費: "每人 NT$35,900 起（最高 NT$37,900）",
    出發日期: "2026/11/14 至 2026/12/06，共 3 團",
    可報名: "2 團，最近一團 2026/11/30",
    航空: "酷航、亞航",
    出團旅行社: "找到了旅行社股份有限公司｜交觀綜字222700號",
  });
  assert.deepEqual(facts.faqs.map((faq) => faq.question), [
    "北海道青池點燈雙溫泉多少錢？",
    "北海道青池點燈雙溫泉什麼時候出發？",
    "北海道青池點燈雙溫泉搭哪家航空？",
    "怎麼報名北海道青池點燈雙溫泉？",
  ]);

  // 沒有團期的行程：不能說出不存在的日期或名額。
  const undated = tripFacts({ title: "豪華檳城5日", region: "檳城", days: "5日", price: "價格洽詢", plans: [{ airline: "航空方案" }], departures: [] }, company, today);
  assert.equal(undated.summary, "「豪華檳城5日」是找到了旅行社出團的檳城 5日團體行程。出發日期與實際團費由顧問依想出發的月份與人數回覆。");
  assert.deepEqual(undated.faqs.map((faq) => faq.question), ["豪華檳城5日多少錢？", "豪華檳城5日什麼時候出發？", "怎麼報名豪華檳城5日？"]);
  assert.equal(undated.items.some((item) => item.label === "可報名" || item.label === "航空"), false);
});

test("VIP tiers and answers stay consistent with the published scheme", async () => {
  const { fastestTrips, vipFaqs, vipPointsPerTrip, vipTiers } = await import("../lib/vip.ts");
  assert.deepEqual(vipPointsPerTrip, { min: 1000, max: 10000 });
  assert.deepEqual(vipTiers.map((tier) => [tier.name, tier.points, tier.guests, tier.mustTravel]), [
    ["個人卡", 25000, "VIP 本人 + 1 位親友", true],
    ["親友卡", 50000, "VIP 本人 + 5 位親友", true],
    ["無限卡", 100000, "VIP 本人 + 不限人數親友", true],
    ["企業卡", 150000, "不限人數親友", false],
  ]);
  assert.deepEqual(vipTiers.map((tier) => fastestTrips(tier.points)), [3, 5, 10, 15]);
  assert.match(vipFaqs[1].answer, /個人卡 25,000 點、親友卡 50,000 點、無限卡 100,000 點、企業卡 150,000 點/);
  // 辦法沒公布的事（折扣金額、點數期限）不能出現在答案裡。
  for (const faq of vipFaqs) assert.doesNotMatch(faq.answer, /\d+\s*(折|%|元)|過期|有效期/);
});
