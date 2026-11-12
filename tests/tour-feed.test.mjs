import assert from "node:assert/strict";
import test from "node:test";
import { parseCruiseFeed, parseDomesticFeed, parseFeedFile, parseTourFeed } from "../lib/tour-feed-parse.ts";
import { baseFeedRegion, buildFeedProducts, matchTrips, resolveMarker } from "../lib/tour-feed-match.ts";

// 仿照業務系統動態檔的排版；姓名、利潤、票款都是虛構的。
const feed = `~L2
■****首  爾＝ZE****▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆
    ●團  型●    11/1~~~10/31  4月後  限定       人數
 ◎特  惠：五天  139-(５.10)=34→----  ---------  達20人每人利+ 3
   超  值：五天  159-(10.20)=38→(36)  ---------  達25人每人利+ 6
 ˙滑  雪：五天  219-(10.20)=51→----  12/1~2/28  -----------
 ˙冰柱節：五天  199-(10.20)=43→----   1/1~2/20  ----------
 ˙冰  釣：五天  219-(10.20)=57→----   1/9~2/18  -----------
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄■=30+38■▄▄▄▄
   特  惠：五天  定*  備註:            機位  餘  人數:                              ＤＬ  領  隊  開票  票+稅
   SEL6ZE1126A5  109  -30(----------)  ＝35  34  １------------------------"促銷"-●                 ------  1113  30+38
 特SEL6ZE1205A5  129  -20(----------)  ＝35   3  １甲5乙4丙3--------------"促銷"-●丁2          1113  ( ?? )  1119  30+38
   SEL6ZE1208A5  169  -40(票- 5-----) 4≠35  --  １甲11乙5------------------"促銷"-●戊4          1111  王小明  1123  25+38
   SEL6ZE1215A5雪219  ---(----------)  ＝35  20  １甲3----------------------------●     出團       ( ?? )  1130  25+38
   SEL7ZE0101A5柱199  ---(票+20-----)  ＝35  30  １-------------------------------●                 ------  1217  30+38
   ====ZE0111A5冰219  ---(票- 5-----)  酷32---- R 2  １甲8----------------------●                 ------  1220  30+38
   SEL6ZE1101A5  109  -30(----------)  ＝35  10  １------------------------"促銷"-●                 ------  1020  30+38
■****東  歐****▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆▆
    ●團／時●     12/1~~3/31      4/1~~~~7/31    第16人    國航＝
   克  斯：８天  499-(10.20)=68  599-(10.20)=143  利潤+109  去:CA190
 ■羅浮敦：15天  定*  備註:              機位  餘  人數:                    ＤＬ  領  隊  開票  票+稅:
   ARN7CA0103A5 1399羅100(票+ 8房-10)1   ＝33  21  １甲7乙2---------------"促銷"-●            ------  1/10  85+129
`;
const now = new Date("2026-11-11T00:00:00Z");
const groups = parseTourFeed(feed, now);

test("parses dates, prices and status from tour lines without keeping private columns", () => {
  assert.deepEqual(groups.map((group) => [group.region, group.label, group.labelDays, group.departures.length]), [
    ["首爾＝ZE", "特惠", 5, 7],
    ["東歐", "羅浮敦", 15, 1],
  ]);
  const [open, few, full, confirmed, nextYear, waitlist] = groups[0].departures;
  assert.deepEqual(open, { code: "SEL6ZE1126A5", airport: "SEL", airline: "ZE", date: "2026/11/26", days: 5, price: 10900, variant: "", from: "", status: "open" });
  assert.equal(few.status, "few");
  assert.equal(few.variant, "特");
  assert.equal(full.status, "full");
  assert.deepEqual([confirmed.variant, confirmed.status, confirmed.price], ["雪", "confirmed", 21900]);
  assert.deepEqual([nextYear.date, nextYear.variant], ["2027/01/01", "柱"]);
  // 「====」沿用上一個團號的前四碼；「R」是候補，視為額滿。
  assert.deepEqual([waitlist.code, waitlist.date, waitlist.status], ["SEL7ZE0111A5", "2027/01/11", "full"]);
  assert.deepEqual(groups[1].departures[0], { code: "ARN7CA0103A5", airport: "ARN", airline: "CA", date: "2027/01/03", days: 15, price: 139900, variant: "羅", from: "", status: "open" });
  const serialized = JSON.stringify(groups);
  for (const secret of ["王小明", "甲", "利潤", "促銷", "30+38", "1113"]) assert.equal(serialized.includes(secret), false, secret);
});

test("reads the product list of each region", () => {
  assert.deepEqual(groups[0].regionProducts, ["特惠", "超值", "滑雪", "冰柱節", "冰釣"]);
  assert.deepEqual(groups[1].regionProducts, ["克斯", "羅浮敦"]);
});

test("resolves one-character markers to product names", () => {
  const products = ["特惠", "超值", "滑雪", "冰柱節", "冰釣"];
  assert.equal(resolveMarker("雪", products, ["雪", "柱", "冰"]), "滑雪");
  assert.equal(resolveMarker("柱", products, ["雪", "柱", "冰"]), "冰柱節");
  assert.equal(resolveMarker("冰", products, ["雪", "柱", "冰"]), "冰釣");
  assert.equal(resolveMarker("豪", products, ["豪"]), "");
  assert.equal(baseFeedRegion("高／大阪＝AK"), "大阪");
  assert.equal(baseFeedRegion("中澳／桂林"), "桂林");
});

test("groups upcoming departures into products and matches website trips", () => {
  const products = buildFeedProducts([{ name: "１０＊首    爾：甲＋乙", groups }], now.getTime());
  assert.deepEqual(products.map((product) => [product.key, product.departures.length]), [
    ["１０＊首爾｜首爾｜特惠｜5", 3],
    ["１０＊首爾｜首爾｜滑雪｜5", 1],
    ["１０＊首爾｜首爾｜冰柱節｜5", 1],
    ["１０＊首爾｜首爾｜冰釣｜5", 1],
    ["１０＊首爾｜東歐｜羅浮敦｜15", 1],
  ]);
  const trip = (id, title, region, days, patch = {}) => ({ id, title, region, days, price: "價格洽詢", plans: [], departures: [], ...patch });
  const matches = matchTrips([
    trip("deal", "首爾超殺特惠五日", "首爾", "5日"),
    trip("ski", "首爾夢幻滑雪五日遊", "首爾", "5日"),
    trip("ice", "首爾冰柱節五日", "首爾", "5日"),
    trip("fish", "首爾冰釣五日", "首爾", "5日"),
    trip("luxury", "首爾尊爵五日", "首爾", "5日"),
    trip("six", "首爾特惠六日", "首爾", "6日"),
    trip("lofoten", "挪威羅弗敦群島極光15天", "挪威羅弗敦群島", "15日", { price: "NT$139,900起", departures: [{ date: "2027/01/03", price: "139,900" }] }),
  ], products);
  const top = Object.fromEntries(matches.map((match) => [match.tripId, [match.status, match.candidates[0]?.key ?? ""]]));
  assert.deepEqual(top, {
    deal: ["auto", "１０＊首爾｜首爾｜特惠｜5"],
    ski: ["auto", "１０＊首爾｜首爾｜滑雪｜5"],
    ice: ["auto", "１０＊首爾｜首爾｜冰柱節｜5"],
    fish: ["auto", "１０＊首爾｜首爾｜冰釣｜5"],
    // 等級不同、天數不同都不該硬湊。
    luxury: ["none", ""],
    six: ["none", ""],
    // 地區字面對不上，但官網既有團期同日同價，足以認定。
    lofoten: ["auto", "１０＊首爾｜東歐｜羅浮敦｜15"],
  });
});

test("sends a product claimed by two website trips to manual review", () => {
  const products = buildFeedProducts([{ name: "１０＊首爾", groups }], now.getTime());
  const trip = (id, title) => ({ id, title, region: "首爾", days: "5日", price: "價格洽詢", plans: [], departures: [] });
  const matches = matchTrips([trip("a", "首爾滑雪五日"), trip("b", "首爾滑雪溫泉五日")], products);
  assert.deepEqual(matches.map((match) => match.status), ["review", "review"]);
});

test("overlays synced departures onto linked trips without exposing seat counts", async () => {
  const { applyTourFeed, resolveFeedLinks, snapshotProduct } = await import("../lib/tour-feed-overlay.ts");
  const products = buildFeedProducts([{ name: "１０＊首爾", groups }], now.getTime());
  const plan = (id, airline) => ({ id, airline, title: "", summary: "", price: "", documentType: "pdf", documentUrl: "", documentName: "", departureMode: "selected", departureIds: ["old"] });
  const trip = (id, title, patch = {}) => ({ id, title, region: "首爾", days: "5日", price: "價格洽詢", featured: false, badge: "韓國", summary: "", image: "", plans: [plan("p1", "易斯達航空")], departures: [{ id: "old", date: "2026/12/01", price: "9,900" }], ...patch });
  const trips = [trip("deal", "首爾超殺特惠五日"), trip("ski", "首爾滑雪五日"), trip("luxury", "首爾尊爵五日"), trip("manual", "韓國冬季限定五日")];
  const snapshot = { syncedAt: now.toISOString(), products: products.map(snapshotProduct), matches: matchTrips(trips, products) };
  const links = { ski: "none", manual: "１０＊首爾｜首爾｜冰釣｜5", ghost: "不存在的商品" };

  assert.deepEqual([...resolveFeedLinks(snapshot, links)], [["deal", "１０＊首爾｜首爾｜特惠｜5"], ["manual", "１０＊首爾｜首爾｜冰釣｜5"]]);

  const content = applyTourFeed({ trips }, snapshot, links, now.getTime(), now.getTime());
  const [deal, ski, luxury, manual] = content.trips;
  assert.deepEqual(deal.departures, [
    { id: "feed-SEL6ZE1126A5", date: "2026/11/26(易斯達)", price: "10,900", note: "" },
    { id: "feed-SEL6ZE1205A5", date: "2026/12/05(易斯達)", price: "12,900", note: "即將額滿" },
    { id: "feed-SEL6ZE1208A5", date: "2026/12/08(易斯達)", price: "16,900", note: "額滿" },
  ]);
  assert.equal(deal.priceMode, "auto");
  assert.deepEqual([deal.plans[0].departureMode, deal.plans[0].departureIds], ["all", []]);
  // 人工排除、沒有對應的行程維持業務原本填的團期。
  assert.equal(ski, trips[1]);
  assert.equal(luxury, trips[2]);
  assert.deepEqual(manual.departures.map((departure) => [departure.date, departure.note]), [["2027/01/11(易斯達)", "額滿"]]);

  // 同步停擺超過三天：不再把舊狀態當現況。
  assert.equal(applyTourFeed({ trips }, snapshot, links, now.getTime(), now.getTime() + 73 * 3600_000).trips[0], trips[0]);
  assert.equal(applyTourFeed({ trips }, null, links, now.getTime()).trips[0], trips[0]);
});

test("splits synced departures between airline-specific plans", async () => {
  const { applyTourFeed } = await import("../lib/tour-feed-overlay.ts");
  const departure = (code, airline, from = "") => ({ code, date: "2027/02/01", price: 35900, status: "open", airline, from });
  const snapshot = {
    syncedAt: now.toISOString(),
    products: [{ key: "k", file: "f", region: "北海道", name: "點燈", days: 6, departures: [departure("A", "FD", "高"), departure("B", "TR")] }],
    matches: [],
  };
  const plan = (id, airline) => ({ id, airline, title: "", summary: "", price: "", documentType: "pdf", documentUrl: "", documentName: "", departureMode: "all", departureIds: [] });
  const base = { id: "t", title: "北海道點燈", region: "北海道", days: "6日", price: "", departures: [] };
  const split = applyTourFeed({ trips: [{ ...base, plans: [plan("p1", "泰國亞洲航空（高雄出發）"), plan("p2", "酷航空")] }] }, snapshot, { t: "k" }, now.getTime(), now.getTime()).trips[0];
  assert.deepEqual(split.departures.map((item) => item.date), ["2027/02/01(亞航・高雄出發)", "2027/02/01(酷航)"]);
  assert.deepEqual(split.plans.map((item) => [item.departureMode, item.departureIds]), [["selected", ["feed-A"]], ["selected", ["feed-B"]]]);
  const shared = applyTourFeed({ trips: [{ ...base, plans: [plan("p1", "酷航"), plan("p2", "星宇航空")] }] }, snapshot, { t: "k" }, now.getTime(), now.getTime()).trips[0];
  assert.deepEqual(shared.plans.map((item) => item.departureMode), ["all", "all"]);
});

// 仿照郵輪與國旅動態檔的排版；姓名都是虛構的。
const cruiseFeed = `~L2
■■*基  隆*▆▆▆▆▆▆▆▆▆▆
 ┌──────────────┐
 │ １２／０４ ＝宮古／沖繩／石垣島：自主遊５天    　    │
 └──────────────┘
內艙房          定:-同  艙房：
  KLU6MS1204A5  219-30  兩人房：甲1xxxxxxxxxxxxxxxxxxxx●完售
                 69- 4  四人房：甲2xxxxxxxxxxxxxxxxxxxx●完售
陽台房
  KLU6MS1204C5  299-30  兩人房：乙3----------------------●         需排候補,RQ=
■■▆▆▆▆▆▆▆▆▆▆
 │ １２／０８ ＝宮古／沖繩／石垣島：自主遊５天    　    │
內艙房          定:-同  艙房：
  KLU6MS1208A5  239-30  兩人房：丙4xxxxxxxxxxxxxxxxxxxx●完售
 │  ０３ ／１４＝鹿兒島、濟州自主遊：自主遊６天    　   │
內艙房          定:-同  艙房：
  KLU7MS0314A6  349-30  兩人房：--------------------------●
`;
const domesticFeed = `F~L2
■*團體出發*30▆▆▆▆▆▆▆▆▆▆
  醉秋楓三天 ▎2999-300=(519) ▎2999-300=(535) ▎11/ 1~12/31
 ■*嘉義:11/1~12/31*●*宿四人房
   醉秋楓：三天  定價  位  餘  人數:                              隨  團  車=315
   TPE6BB1119A3  2999  41  --  甲6乙5丙8                          王小明  統=315
   TPE6BB1203A3  2999  42   2  甲6乙5                              ( ?? )  統=315
   TPE6BB1220A3  2999  42  42                                      ------  ------
 中TXG6BB1203A3  2999  42  40  丁2                                 ------  ------
`;

test("parses cruise sailings into one departure per sailing", () => {
  const sailings = parseCruiseFeed(cruiseFeed, now);
  assert.deepEqual(sailings.map((group) => [group.region, group.label, group.labelDays]), [["基隆", "宮古/沖繩/石垣島", 5], ["基隆", "鹿兒島、濟州", 6]]);
  // 內艙完售、陽台還能訂：這個航次沒有額滿，售價取還買得到的最低艙等；「-30」同業折讓不讀。
  assert.deepEqual(sailings[0].departures.map((d) => [d.date, d.price, d.status]), [["2026/12/04", 29900, "open"], ["2026/12/08", 23900, "full"]]);
  assert.deepEqual(sailings[1].departures.map((d) => [d.date, d.days, d.price, d.status]), [["2027/03/14", 6, 34900, "open"]]);
  for (const secret of ["甲", "乙", "丙", "RQ"]) assert.equal(JSON.stringify(sailings).includes(secret), false, secret);
  assert.deepEqual(parseFeedFile("１８＊ＭＳＣ：甲＋乙", cruiseFeed, now), sailings);
});

test("parses domestic tours with prices in plain dollars", () => {
  const tours = parseDomesticFeed(domesticFeed, now);
  assert.deepEqual(tours.map((group) => [group.region, group.label, group.labelDays]), [["台灣", "醉秋楓", 3]]);
  assert.deepEqual(tours[0].departures.map((d) => [d.code, d.date, d.price, d.status, d.from]), [
    ["TPE6BB1119A3", "2026/11/19", 2999, "full", ""],
    ["TPE6BB1203A3", "2026/12/03", 2999, "few", ""],
    ["TPE6BB1220A3", "2026/12/20", 2999, "open", ""],
    ["TXG6BB1203A3", "2026/12/03", 2999, "open", "中"],
  ]);
  for (const secret of ["王小明", "甲", "519", "315"]) assert.equal(JSON.stringify(tours).includes(secret), false, secret);
  assert.deepEqual(parseFeedFile("０１＊國    旅：甲", domesticFeed, now), tours);
});

test("matches cruise trips by ship and route, not by coincidental dates", () => {
  const products = buildFeedProducts([
    { name: "１８＊ＭＳＣ：甲", groups: parseCruiseFeed(cruiseFeed, now) },
    { name: "１９＊麗星輪：甲", groups: parseCruiseFeed(cruiseFeed, now) },
    { name: "０１＊國    旅：甲", groups: parseDomesticFeed(domesticFeed, now) },
  ], now.getTime());
  const trip = (id, title, days, dates) => ({ id, title, region: "基隆出發郵輪", days, price: "價格洽詢", plans: [], departures: dates.map((date) => ({ date, price: "" })) });
  const matches = matchTrips([
    trip("msc5", "MSC榮耀號 宮古島、沖繩、石垣島自主遊5天", "5日", ["2026/12/04", "2026/12/08"]),
    trip("msc6", "MSC榮耀號 鹿兒島、濟州自主遊6天", "6日", ["2027/03/14"]),
    // 同一天出發的別家船、沒寫船名的行程，都不能因為日期一樣就被套上。
    trip("other", "皇家加勒比 宮古島、沖繩、石垣島5天", "5日", ["2026/12/04"]),
    trip("land", "阿里山三日", "3日", ["2026/12/03"]),
  ], products);
  assert.deepEqual(matches.map((match) => [match.tripId, match.status, match.candidates[0]?.key ?? ""]), [
    ["msc5", "auto", "１８＊ＭＳＣ｜基隆｜宮古/沖繩/石垣島｜5"],
    ["msc6", "auto", "１８＊ＭＳＣ｜基隆｜鹿兒島、濟州｜6"],
    ["other", "none", ""],
    ["land", "none", ""],
  ]);
});

test("sync signs in, reads plain-text files and stores only public fields", async (t) => {
  const { S3Client } = await import("@aws-sdk/client-s3");
  const { syncTourFeed, TourFeedError } = await import("../lib/tour-feed-sync.ts");
  const { defaultSiteContent } = await import("../lib/site-content.ts");
  t.mock.property(process, "env", {
    ...process.env,
    BUCKET_NAME: "test", BUCKET_ENDPOINT: "https://example.invalid", BUCKET_ACCESS_KEY_ID: "test", BUCKET_SECRET_ACCESS_KEY: "test",
    TOUR_FEED_EMAIL: "site@example.com", TOUR_FEED_PASSWORD: "pw", TOUR_FEED_API_KEY: "key", TOUR_FEED_API_URL: "https://feed.example/",
  });
  t.mock.method(console, "error", () => {});
  const written = new Map();
  t.mock.method(S3Client.prototype, "send", async (command) => {
    if (command.constructor.name === "PutObjectCommand") return void written.set(command.input.Key, command.input.Body);
    if (String(command.input.Key).startsWith("tour-feed/")) throw Object.assign(new Error("missing"), { name: "NoSuchKey" });
    const trips = [{ ...defaultSiteContent.trips[0], id: "deal", title: "首爾超殺特惠五日", region: "首爾", days: "5日", price: "價格洽詢", plans: [], departures: [] }];
    return { ETag: '"v"', Body: { transformToString: async () => JSON.stringify({ ...defaultSiteContent, trips }) } };
  });
  const calls = [];
  let password = "pw";
  t.mock.method(globalThis, "fetch", async (url, init) => {
    calls.push([String(url), init.headers]);
    if (String(url).startsWith("https://identitytoolkit.googleapis.com/")) {
      return JSON.parse(init.body).password === password
        ? Response.json({ idToken: "token-1" })
        : Response.json({ error: { message: "INVALID_LOGIN_CREDENTIALS" } }, { status: 400 });
    }
    if (String(url) === "https://feed.example/api/sales-files") return Response.json([{ id: "f1", name: "１０＊首    爾：甲＋乙" }, { id: "f2", name: "１８＊ＭＳＣ：甲" }]);
    if (String(url) === "https://feed.example/api/file-content/f1") return new Response(feed, { headers: { "content-type": "text/plain" } });
    if (String(url) === "https://feed.example/api/file-content/f2") return new Response(cruiseFeed, { headers: { "content-type": "text/plain" } });
    return new Response("not found", { status: 404 });
  });

  const snapshot = await syncTourFeed();
  assert.deepEqual(calls.map(([url]) => url.replace(/\?.*$/, "")), [
    "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword",
    "https://feed.example/api/sales-files",
    "https://feed.example/api/file-content/f1",
    "https://feed.example/api/file-content/f2",
  ]);
  assert.equal(calls[1][1].Authorization, "Bearer token-1");
  assert.equal(snapshot.products.length, 7);
  assert.deepEqual(snapshot.matches.map((match) => [match.tripId, match.status]), [["deal", "auto"]]);
  const stored = written.get("tour-feed/snapshot.json");
  assert.equal(JSON.parse(stored).products.length, 7);
  for (const secret of ["王小明", "甲5", "利潤", "token-1", "pw"]) assert.equal(stored.includes(secret), false, secret);

  // 密碼錯：講得出原因，而且不覆蓋上一次的結果。
  written.clear();
  password = "changed";
  await assert.rejects(syncTourFeed(), (error) => error instanceof TourFeedError && error.message === "登入：業務系統回應 400（INVALID_LOGIN_CREDENTIALS）");
  assert.equal(written.size, 0);
});
