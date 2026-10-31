import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { findNewsArticle, newsArticles, newsDateLabel, publishedNews } from "../lib/news.ts";

const validDate = /^\d{4}-\d{2}-\d{2}$/;
const articleText = (article) => JSON.stringify(article);

test("every news article has a usable address, valid dates and a cover", () => {
  const slugs = newsArticles.map((article) => article.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const article of newsArticles) {
    assert.match(article.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.match(article.publishedAt, validDate);
    assert.ok(!Number.isNaN(Date.parse(article.publishedAt)));
    if (article.updatedAt) assert.match(article.updatedAt, validDate);
    assert.ok(article.title && article.shortTitle && article.summary && article.category);
    assert.ok(article.image.startsWith("/") && article.imageAlt);
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
  assert.deepEqual(publishedNews([older, newer]).map((article) => article.slug), ["newer", "older"]);
  assert.equal(findNewsArticle("newer", [older, newer]), newer);
  assert.equal(findNewsArticle("missing", [older, newer]), undefined);
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
