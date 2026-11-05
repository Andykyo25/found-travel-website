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
