import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { findNewsArticle } from "../lib/news.ts";
import { titlePhrases } from "../lib/title-phrases.ts";
import { activePromotion, promotionEndLabel, promotions, taipeiDateKey } from "../lib/promotions.ts";

test("promotions point at a real article and image and have a sane window", async () => {
  const ids = promotions.map((promotion) => promotion.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const promotion of promotions) {
    assert.match(promotion.startsAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(promotion.endsAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(promotion.startsAt <= promotion.endsAt);
    assert.ok(promotion.title && promotion.text && promotion.cta && promotion.imageAlt);
    if (promotion.href.startsWith("/news/")) assert.ok(findNewsArticle(promotion.href.slice("/news/".length)), promotion.href);
    await access(new URL(`../public${promotion.image}`, import.meta.url));
  }
});

test("a promotion runs from its first to its last day in Taiwan time", () => {
  // 台灣時間 12/31 23:59:59 還在，跨過午夜就下架。
  assert.equal(taipeiDateKey(new Date("2026-12-31T15:59:59Z")), "2026-12-31");
  assert.equal(taipeiDateKey(new Date("2026-12-31T16:00:00Z")), "2027-01-01");
  assert.equal(activePromotion(new Date("2026-11-20T04:00:00Z"))?.id, "esun-card-europe-2026");
  assert.equal(activePromotion(new Date("2026-12-31T15:59:59Z"))?.id, "esun-card-europe-2026");
  assert.equal(activePromotion(new Date("2026-12-31T16:00:00Z")), undefined);
  assert.equal(activePromotion(new Date("2026-08-14T15:59:59Z")), undefined);
  assert.equal(activePromotion(new Date("2026-08-14T16:00:00Z"))?.id, "esun-card-europe-2026");
  assert.equal(promotionEndLabel({ endsAt: "2026-12-31" }), "12/31");
  assert.equal(promotionEndLabel({ endsAt: "2027-01-05" }), "1/5");
});

test("titles wrap at punctuation, not inside a word or a price", () => {
  assert.deepEqual(titlePhrases("刷玉山卡暢遊歐洲，熱門團每人現折 NT$1,000"), ["刷玉山卡暢遊歐洲，", "熱門團每人現折 NT$1,000"]);
  assert.deepEqual(titlePhrases("東京日記：西日暮里民宿＋台灣人司機接送包車，一次排好"), [
    "東京日記：",
    "西日暮里民宿＋台灣人司機接送包車，",
    "一次排好",
  ]);
  assert.deepEqual(titlePhrases("沒有標點的標題"), ["沒有標點的標題"]);
});

test("credit card promotions carry the required warning", () => {
  const esun = promotions.find((promotion) => promotion.id === "esun-card-europe-2026");
  assert.equal(esun?.warning, "謹慎理財 信用無價");
});

test("the homepage shows the active promotion as a card and a popup", async () => {
  const [home, popup] = await Promise.all(
    ["../app/page.tsx", "../app/components/PromoPopup.tsx"].map((file) => readFile(new URL(file, import.meta.url), "utf8")),
  );
  assert.match(home, /const promotion = activePromotion\(\)/);
  assert.match(home, /<PromoCard promotion=\{promotion\} \/>/);
  assert.match(home, /<PromoPopup promotion=\{promotion\} \/>/);
  // 彈窗要能用 Esc 關閉、記住看過，而且不在其他視窗開著時跳出。
  assert.match(popup, /showModal\(\)/);
  assert.match(popup, /onClose=\{\(\) => rememberSeen\(promotion\.id\)\}/);
  assert.match(popup, /localStorage/);
});
