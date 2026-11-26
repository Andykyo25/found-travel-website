import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { adjacentNews, findNewsArticle, newsArticles, newsDateLabel, newsListPage, newsPageSize, newsTopic, newsTopicByCategory, newsTopics, publishedNews, relatedNews, taipeiDate } from "../lib/news.ts";

const validDate = /^\d{4}-\d{2}-\d{2}$/;
const articleText = (article) => JSON.stringify(article);

test("every news article has a usable address, valid dates and a cover", async () => {
  const slugs = newsArticles.map((article) => article.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const article of newsArticles) {
    assert.match(article.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.match(article.publishedAt, validDate);
    assert.ok(!Number.isNaN(Date.parse(article.publishedAt)));
    if (article.updatedAt) assert.match(article.updatedAt, validDate);
    assert.ok(article.title && article.shortTitle && article.summary && article.category);
    assert.ok(article.image.startsWith("/") && article.imageAlt);
    await access(new URL(`../public${article.image}`, import.meta.url));
  }
});

test("news blocks have unique anchors and every source is a public https link", () => {
  for (const article of newsArticles) {
    const ids = article.blocks.map((block) => block.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(article.blocks.length > 0);
    for (const source of article.sources) assert.match(source.href, /^https:\/\//);
  }
});

test("news is listed newest first and unknown addresses find nothing", () => {
  const older = { ...newsArticles[0], slug: "older", publishedAt: "2026-01-02" };
  const newer = { ...newsArticles[0], slug: "newer", publishedAt: "2026-12-30" };
  assert.deepEqual(publishedNews([older, newer], "2027-01-01").map((article) => article.slug), ["newer", "older"]);
  assert.equal(findNewsArticle("newer", [older, newer], "2027-01-01"), newer);
  assert.equal(findNewsArticle("missing", [older, newer], "2027-01-01"), undefined);
  assert.equal(newsDateLabel("2026-10-31"), "2026.10.31");
});

test("the Japan tax-free article keeps the facts travelers rely on", () => {
  const article = findNewsArticle("japan-tax-free-2026");
  assert.ok(article);
  const text = articleText(article);
  for (const fact of ["2026/11/1", "¥5,000", "90 天", "Confirm", "託運行李前"]) assert.ok(text.includes(fact), fact);
  for (const airport of ["成田", "羽田", "關西", "中部", "新千歲", "福岡", "那霸"]) assert.ok(text.includes(airport), airport);
  for (const shop of ["DONKI", "Bic Camera", "TAKEYA", "Tsuruha"]) assert.ok(text.includes(shop), shop);
  assert.equal(article.blocks.find((block) => block.kind === "methods").items.length, 3);
  // 退款方式依店家而定：機台與 0 手續費都必須保留但書。
  assert.ok(text.includes("依店家公告為準"));
  assert.ok(text.includes("仍須完成海關確認"));
});

test("the E.SUN card Europe offer keeps its terms and points at trips on this site", () => {
  const article = findNewsArticle("esun-card-europe-2026");
  assert.ok(article);
  // 主視覺含文字：用橫幅版面完整顯示，不裁切。
  assert.equal(article.imageBanner, true);
  const text = articleText(article);
  for (const fact of ["NT$1,000", "2026/12/31", "2026/8/15", "線上分期付款不適用", "持卡人", "團體優惠", "每一團限折一次", "謹慎理財"]) {
    assert.ok(text.includes(fact), fact);
  }
  // Unicard 回饋由銀行決定，必須留著但書。
  assert.ok(text.includes("以玉山銀行公告為準"));
  const routes = article.blocks.find((block) => block.kind === "routes");
  assert.deepEqual(routes.items.map((route) => route.name), ["瑞士火車團", "芬蘭極光團", "巴爾幹半島團"]);
  for (const route of routes.items) {
    assert.ok(route.trips.length > 0, route.name);
    for (const key of route.trips) assert.match(key, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  }
});

test("LINE, Instagram and Facebook links sit in the header, footer and mobile menu", async () => {
  const [links, header, footer, mobileNav] = await Promise.all(
    [
      "../app/components/SocialLinks.tsx",
      "../app/components/SiteHeader.tsx",
      "../app/components/SiteFooter.tsx",
      "../app/components/MobileNav.tsx",
    ].map((file) => readFile(new URL(file, import.meta.url), "utf8")),
  );
  // 網址放在 structured-data（Yui 的實體資料也用），SocialLinks 從那裡引入。
  const { instagramUrl } = await import("../lib/structured-data.ts");
  assert.equal(instagramUrl, "https://www.instagram.com/yusyun1218/");
  assert.match(links, /import \{ instagramUrl \} from "@\/lib\/structured-data"/);
  assert.match(links, /href=\{instagramUrl\}/);
  assert.match(links, /href=\{lineUrl\}/);
  assert.match(header, /<SocialLinks lineUrl=\{lineUrl\}/);
  assert.match(footer, /<SocialLinks lineUrl=\{content\.lineUrl\}/);
  assert.match(mobileNav, /href=\{instagramUrl\}/);
  assert.match(links, /export const facebookUrl = "https:\/\/www\.facebook\.com\/profile\.php\?id=61596819122408"/);
  assert.match(links, /href=\{facebookUrl\}/);
  assert.match(mobileNav, /href=\{facebookUrl\}/);
});

test("news is reachable from the navigation, footer, sitemap and host redirect", async () => {
  const [header, footer, sitemap, config, listPage, articlePage] = await Promise.all(
    [
      "../app/components/SiteHeader.tsx",
      "../app/components/SiteFooter.tsx",
      "../app/sitemap.ts",
      "../next.config.ts",
      "../app/news/page.tsx",
      "../app/news/[slug]/page.tsx",
    ].map((file) => readFile(new URL(file, import.meta.url), "utf8")),
  );
  assert.match(header, /href: "\/news", label: "最新消息"/);
  assert.match(footer, /href="\/news"/);
  assert.match(sitemap, /publishedNews/);
  assert.match(config, /"\/news\/:path\*"/);
  assert.match(listPage, /canonical: "\/news"/);
  assert.match(articlePage, /notFound\(\)/);
  assert.match(articlePage, /NewsArticle/);
  assert.match(articlePage, /canonical/);
});

test("scheduled articles stay hidden until their publish date in Taiwan", () => {
  const today = { ...newsArticles[0], slug: "today", publishedAt: "2026-12-03" };
  const later = { ...newsArticles[0], slug: "later", publishedAt: "2026-12-10" };
  assert.deepEqual(publishedNews([today, later], "2026-12-03").map((article) => article.slug), ["today"]);
  assert.equal(findNewsArticle("later", [today, later], "2026-12-03"), undefined);
  assert.equal(findNewsArticle("later", [today, later], "2026-12-10"), later);
  // 台灣已經是 12/10 早上、UTC 還是 12/9：以台灣日期為準。
  assert.equal(taipeiDate(new Date("2026-12-09T17:00:00Z")), "2026-12-10");
});

test("new travel articles keep their checked facts and link to trips on this site", () => {
  const all = "2099-01-01";
  const keta = JSON.stringify(findNewsArticle("korea-k-eta-2027", newsArticles, all));
  for (const fact of ["2027/12/31", "抵達前 3 天", "₩10,000", "e-arrivalcard.go.kr", "bbsSn=332884"]) assert.ok(keta.includes(fact), fact);
  const holidays = JSON.stringify(findNewsArticle("2027-long-weekends", newsArticles, all));
  for (const fact of ["121 天", "9 個", "2/4（四）–2/10（三）", "2/4–2/14 連休 11 天", "10/9–10/25 連休 17 天", "以各公司規定為準"]) assert.ok(holidays.includes(fact), fact);
  const aurora = JSON.stringify(findNewsArticle("northern-lights-guide", newsArticles, all));
  for (const fact of ["約 50%", "午夜前後", "3 月到 4 月初", "無法保證"]) assert.ok(aurora.includes(fact), fact);
  // 排程中的兩篇在上線日前不會出現。
  assert.equal(findNewsArticle("2027-long-weekends", newsArticles, "2026-12-02"), undefined);
  assert.ok(findNewsArticle("2027-long-weekends", newsArticles, "2026-12-03"));
  assert.equal(findNewsArticle("northern-lights-guide", newsArticles, "2026-12-09"), undefined);
  assert.ok(findNewsArticle("northern-lights-guide", newsArticles, "2026-12-10"));
  const starlux = JSON.stringify(findNewsArticle("starlux-sydney-auckland", newsArticles, all));
  for (const fact of ["2027/3/23", "每週 4 班", "A330-900", "JX183", "JX184", "sydney-gold-coast-highlights-8d", "new-zealand-north-south-highlights-12d", "NZeTA", "最終公告為準"]) assert.ok(starlux.includes(fact), fact);
});

test("every article category belongs to one of the list topics", () => {
  const slugs = newsTopics.map((topic) => topic.slug);
  for (const article of newsArticles) {
    // 新的 category 要在 newsTopicByCategory 補上歸類，否則會被猜到錯的分類。
    assert.ok(article.category in newsTopicByCategory, article.category);
    assert.ok(slugs.includes(newsTopic(article)), article.category);
  }
});

test("the news list pages and filters by topic", () => {
  const make = (index, category) => ({ ...newsArticles[0], slug: `a${index}`, category, publishedAt: `2026-01-${String(30 - index).padStart(2, "0")}` });
  const articles = Array.from({ length: newsPageSize + 3 }, (_, index) => make(index, index % 3 ? "日本旅遊須知" : "限時優惠"));
  const first = newsListPage(articles);
  assert.equal(first.pageCount, 2);
  assert.equal(first.items.length, newsPageSize);
  const second = newsListPage(articles, { page: 2 });
  assert.deepEqual(second.items.map((item) => item.slug), ["a12", "a13", "a14"]);
  // 超出範圍的頁碼回到最接近的那一頁。
  assert.equal(newsListPage(articles, { page: 99 }).page, 2);
  assert.equal(newsListPage(articles, { page: 0 }).page, 1);
  const offers = newsListPage(articles, { topic: "offers" });
  assert.equal(offers.total, 5);
  assert.ok(offers.items.every((item) => item.category === "限時優惠"));
});

test("article pages link to the previous, next and related articles", () => {
  const a = { ...newsArticles[0], slug: "a", category: "日本旅遊須知", publishedAt: "2026-01-01" };
  const b = { ...newsArticles[0], slug: "b", category: "限時優惠", publishedAt: "2026-01-02" };
  const c = { ...newsArticles[0], slug: "c", category: "韓國旅遊須知", publishedAt: "2026-01-03" };
  const future = { ...newsArticles[0], slug: "future", category: "日本旅遊須知", publishedAt: "2026-02-01" };
  const list = [a, b, c, future];
  const today = "2026-01-10";
  assert.deepEqual(adjacentNews("b", list, today), { previous: a, next: c });
  // 最新的一篇沒有下一篇，還沒上線的文章也不會被連到。
  assert.equal(adjacentNews("c", list, today).next, undefined);
  // 同類（出國須知）優先，再補其他最新的。
  assert.deepEqual(relatedNews("a", list, today).map((item) => item.slug), ["c", "b"]);
});
