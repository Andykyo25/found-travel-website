import assert from "node:assert/strict";
import test from "node:test";
import { parseTourFeed } from "../lib/tour-feed-parse.ts";
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
