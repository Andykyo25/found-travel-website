import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("the finished travel site replaces all starter content", async () => {
  const [
    page,
    layout,
    content,
    packageJson,
    studioPage,
    studioSettingsPage,
    tripsEditor,
    auth,
    railway,
    datesPage,
    contactPage,
    contactApi,
    contactNotify,
    travelToolsApi,
    travelTools,
    studioContactsPage,
    packageCard,
    departureBoard,
    robotsRoute,
    sitemapRoute,
    monthPage,
  ] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/site-content.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/studio/settings/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/TripsEditor.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/studio-auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../railway.json", import.meta.url), "utf8"),
    readFile(new URL("../app/dates/[tripId]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/contact/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/contact/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/contact-notify.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../app/api/travel-tools/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/components/TravelTools.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/studio/contacts/page.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/components/PackageCard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/dates/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/robots.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../app/dates/month/[month]/page.tsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(page, /精選行程/);
  assert.match(page, /TravelTools/);
  assert.match(page, /內容管理/);
  assert.match(page, /PackageCard/);
  assert.match(page, /TripFilterBar/);
  assert.match(page, /hero-full/);
  assert.match(page, /homepage\.mp4|content\.videoUrl/);
  assert.match(content, /找到了旅行社/);
  assert.match(content, /OR5AYhI/);
  assert.match(content, /documentType/);
  assert.match(content, /departures/);
  assert.match(packageCard, /出發時間/);
  assert.match(packageCard, /dates\//);
  assert.match(page, /href="\/dates"/);
  assert.match(departureBoard, /upcomingDepartureRows/);
  assert.match(robotsRoute, /isTemporaryHost/);
  assert.match(robotsRoute, /\/studio/);
  assert.match(sitemapRoute, /dates\/month\//);
  assert.match(monthPage, /generateMetadata/);
  assert.match(monthPage, /canonical/);
  assert.match(datesPage, /canonical/);
  assert.match(datesPage, /notFound/);
  assert.match(datesPage, /出發日期/);
  assert.match(content, /00161819/);
  assert.match(content, /writeSiteContentObject/);
  assert.match(content, /東京慢旅 5日/);
  assert.match(content, /北海道花野 7日/);
  assert.match(content, /峇里島療癒 6日/);
  assert.match(layout, /找到了旅行社/);
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.doesNotMatch(packageJson, /vinext|wrangler|drizzle-orm/);
  assert.match(page, /href="\/contact"/);
  assert.match(contactPage, /ContactForm/);
  assert.match(contactApi, /parseContactRequestInput/);
  assert.match(contactApi, /notifyContactRequest/);
  assert.match(contactNotify, /api\.line\.me\/v2\/bot\/message\/push/);
  assert.match(contactNotify, /CONTACT_WEBHOOK_URL/);
  assert.match(travelToolsApi, /status: 503/);
  assert.match(travelToolsApi, /X-Travel-Data.*unavailable/s);
  assert.doesNotMatch(travelToolsApi, /temperature: 26|rate: currency/);
  assert.match(travelTools, /暫時無法取得/);
  assert.match(studioContactsPage, /requireStudioUser/);
  assert.match(studioContactsPage, /loadStatus === "error"/);
  assert.match(studioContactsPage, /ContactRequestTable/);
  assert.match(studioPage, /requireStudioUser/);
  assert.match(studioPage, /TripsEditor/);
  assert.match(studioSettingsPage, /requireStudioUser/);
  assert.match(studioSettingsPage, /SiteSettingsEditor/);
  assert.match(tripsEditor, /待補資料/);
  assert.match(auth, /STUDIO_ADMIN_EMAIL/);
  assert.match(auth, /STUDIO_USERS/);
  assert.doesNotMatch(auth, /ChatGPT/);
  assert.match(railway, /DOCKERFILE/);

  await access(new URL("../.next/standalone/server.js", import.meta.url));
  await assert.rejects(
    access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)),
  );
});
