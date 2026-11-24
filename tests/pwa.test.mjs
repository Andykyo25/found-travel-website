import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import manifest from "../app/manifest.ts";
import { findNewsArticle } from "../lib/news.ts";

const publicFile = (path) => new URL(`../public${path}`, import.meta.url);

test("the manifest makes the site installable with icons that exist", async () => {
  const data = manifest();
  assert.equal(data.display, "standalone");
  assert.equal(data.start_url, "/");
  assert.ok(data.name && data.short_name);
  const sizes = data.icons.map((icon) => icon.sizes);
  assert.ok(sizes.includes("192x192") && sizes.includes("512x512"));
  assert.ok(data.icons.some((icon) => icon.purpose === "maskable"));
  for (const icon of data.icons) await access(publicFile(icon.src));
  await access(new URL("../app/apple-icon.png", import.meta.url));
});

test("the service worker keeps pages fresh and never touches the studio or API", async () => {
  const sw = await readFile(publicFile("/sw.js"), "utf8");
  // 頁面一律網路優先，連不上才用存下的那份。
  assert.match(sw, /request\.mode === "navigate"[\s\S]*networkFirstPage/);
  assert.match(sw, /studio\|api/);
  assert.match(sw, /request\.method !== "GET"/);
  assert.match(sw, /OFFLINE_URL = "\/offline"/);
});

test("the install guide covers iPhone, Android and in-app browsers", () => {
  const article = findNewsArticle("add-to-home-screen");
  assert.ok(article);
  const text = JSON.stringify(article);
  for (const fact of ["Safari", "Chrome", "加入主畫面", "加到主畫面", "LINE", "以顧問確認為準"]) assert.ok(text.includes(fact), fact);
  assert.equal(article.blocks.find((block) => block.kind === "methods").items.length, 2);
});
