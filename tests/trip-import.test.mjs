import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  importListFileName,
  matchImportFiles,
  mergeImportedTrips,
  normalizeImportPath,
  parseImportList,
  pathInsideSelectedFolder,
  tripWithDocuments,
} from "../lib/trip-import.ts";
import { tripDraftProblems, validateContentDraft } from "../lib/trip-validation.ts";

const plan = (id, file, extra = {}) => ({
  id, file, airline: "酷航", title: "台北出發", summary: "", price: "", documentType: "pdf",
  documentName: "查看完整行程", departureMode: "all", departureIds: [], ...extra,
});
const trip = (id, plans, extra = {}) => ({
  id, slug: `${id}-slug`, featured: false, badge: "日本", region: "北海道", days: "6日", title: `行程 ${id}`,
  summary: "行程亮點：白金青池。", price: "價格洽詢", priceMode: "auto", image: "https://images.unsplash.com/photo-1", plans, departures: [], ...extra,
});
const list = (trips) => ({ version: 1, source: "旅展行程", trips });

test("import list is read only when it is the expected version and every version points at a PDF", () => {
  assert.equal(importListFileName, "匯入清單.json");
  assert.ok("list" in parseImportList(list([trip("a", [plan("p1", "6.日本線/北海道.pdf")])])));
  assert.match(parseImportList({ version: 2, trips: [] }).error, /版本/);
  assert.match(parseImportList(list([])).error, /沒有行程/);
  assert.match(parseImportList(list([trip("a", [])])).error, /沒有任何版本/);
  assert.match(parseImportList(list([trip("a", [plan("p1", "../secret.pdf")])])).error, /PDF/);
  assert.match(parseImportList(list([trip("a", [plan("p1", "notes.docx")])])).error, /PDF/);
  assert.match(parseImportList(list([trip("bad id!", [plan("p1", "a.pdf")])])).error, /編號/);
});

test("folder paths are compared without the selected folder name and in one Unicode form", () => {
  assert.equal(pathInsideSelectedFolder("旅展行程/5.韓國 A/首爾/(ZE)首爾「超值」五日遊.pdf"), "5.韓國 A/首爾/(ZE)首爾「超值」五日遊.pdf");
  assert.equal(pathInsideSelectedFolder("旅展行程/匯入清單.json"), "匯入清單.json");
  // macOS 給的檔名可能是分解形式（NFD），比對前統一成 NFC。
  const decomposed = String.fromCharCode(0x304b, 0x3099) + ".pdf"; // か + 濁點
  assert.equal(normalizeImportPath(decomposed), String.fromCharCode(0x304c) + ".pdf"); // が
  assert.equal(normalizeImportPath("a\\b.pdf"), "a/b.pdf");
});

test("versions whose PDF is not in the folder are dropped, and a trip without any version is skipped", () => {
  const parsed = parseImportList(list([
    trip("a", [plan("p1", "x/one.pdf"), plan("p2", "x/missing.pdf")]),
    trip("b", [plan("p3", "x/gone.pdf")]),
  ])).list;
  const result = matchImportFiles(parsed, new Map([["x/one.pdf", "FILE-1"]]));
  assert.equal(result.trips.length, 1);
  assert.deepEqual(result.trips[0].trip.plans.map((p) => p.id), ["p1"]);
  assert.equal(result.trips[0].files.get("p1"), "FILE-1");
  assert.deepEqual(result.missingFiles, ["x/missing.pdf", "x/gone.pdf"]);
  assert.deepEqual(result.skippedTrips, ["行程 b"]);
});

test("uploaded PDFs become the versions' document links and the file paths are not stored", () => {
  const ready = tripWithDocuments(trip("a", [plan("p1", "x/one.pdf")]), new Map([["p1", "/api/trip-pdf?key=trip-pdfs/1.pdf"]]));
  assert.equal(ready.plans[0].documentUrl, "/api/trip-pdf?key=trip-pdfs/1.pdf");
  assert.equal(ready.plans[0].documentType, "pdf");
  assert.equal("file" in ready.plans[0], false);
  assert.deepEqual(tripDraftProblems(ready), []);
});

test("merging appends new trips after the existing ones and never duplicates a trip", () => {
  const existing = [trip("live", [plan("p0", "")], { slug: "hokkaido-6d", previousSlugs: ["old-slug"] })];
  const incoming = [
    trip("live", [plan("p1", "")]),
    trip("new1", [plan("p2", "")], { slug: "hokkaido-6d" }),
    trip("new2", [plan("p3", "")], { slug: "old-slug" }),
    trip("new3", [plan("p4", "")], { slug: "seoul-5d" }),
    trip("new3", [plan("p5", "")], { slug: "seoul-5d-x" }),
  ];
  const merged = mergeImportedTrips(existing, incoming);
  assert.deepEqual(merged.trips.map((t) => t.id), ["live", "new1", "new2", "new3"]);
  assert.deepEqual(merged.alreadyThere, ["行程 live", "行程 new3"]);
  // 撞到現有網址（包括舊網址）的代稱拿掉，交給網站自動產生。
  assert.equal(merged.added[0].slug, undefined);
  assert.equal(merged.added[1].slug, undefined);
  assert.equal(merged.added[2].slug, "seoul-5d");
  assert.equal(validateContentDraft({ trips: merged.trips, telephone: "", email: "" }), null);
});

test("import page and API: studio-only, appends on the server and saves in batches", async () => {
  const [route, page, component, header, editor, pkg] = await Promise.all(
    [
      "../app/api/studio/import/route.ts",
      "../app/studio/import/page.tsx",
      "../app/components/TripImport.tsx",
      "../app/components/StudioHeader.tsx",
      "../app/components/TripsEditor.tsx",
      "../package.json",
    ].map((file) => readFile(new URL(file, import.meta.url), "utf8")),
  );
  assert.match(route, /isSameOriginRequest\(request\)/);
  assert.match(route, /getStudioUserFromRequest\(request\)/);
  assert.match(route, /tripDraftProblems\(trip\)/);
  assert.match(route, /tripPdfKeyFromDocumentUrl/);
  assert.match(route, /mergeImportedTrips\(previous\.trips/);
  assert.match(route, /saveSiteContent\(draft, user\.email, meta\.etag/);
  assert.match(page, /requireStudioUser\(\)/);
  assert.match(page, /active="import"/);
  assert.match(component, /setAttribute\("webkitdirectory", ""\)/);
  assert.match(component, /fetch\("\/api\/studio\/pdf"/);
  assert.match(component, /fetch\("\/api\/studio\/import"/);
  assert.match(component, /tripsPerSave = 25/);
  // 進度的行程總數在開始時固定，不會隨著已存好的行程變少。
  assert.match(component, /行程 \{progress\.trips\} \/ \{progress\.totalTrips\}/);
  assert.match(component, /totalTrips: pending\.length/);
  assert.match(header, /active === "import"/);
  assert.match(editor, /href="\/studio\/import"/);
  assert.match(pkg, /tests\/trip-import\.test\.mjs/);
});
