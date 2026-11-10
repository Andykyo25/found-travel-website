import assert from "node:assert/strict";
import test from "node:test";
import { S3Client } from "@aws-sdk/client-s3";
import {
  clearPublicContentCache,
  defaultSiteContent,
  getSiteContent,
  getSiteContentIfAvailable,
  saveSiteContent,
} from "../lib/site-content.ts";
import { edgeCacheHeaders, edgeCachedPaths, edgeCacheSeconds } from "../lib/edge-cache.ts";

// 假的 Bucket：記下讀取次數，可以改內容、讓它失敗，或讓讀取停在半路。
function fakeBucket(t) {
  t.mock.property(process, "env", { ...process.env, BUCKET_NAME: "test", BUCKET_ENDPOINT: "https://example.invalid", BUCKET_ACCESS_KEY_ID: "test", BUCKET_SECRET_ACCESS_KEY: "test" });
  t.mock.timers.enable({ apis: ["Date"], now: Date.UTC(2026, 10, 10) });
  t.mock.method(console, "error", () => {});
  clearPublicContentCache();
  t.after(clearPublicContentCache);
  const bucket = { reads: 0, brand: "第一版", down: false, gate: null };
  t.mock.method(S3Client.prototype, "send", async (command) => {
    if (command.constructor.name !== "GetObjectCommand") return { ETag: '"saved"' };
    bucket.reads += 1;
    const brand = bucket.brand;
    if (bucket.gate) await bucket.gate;
    if (bucket.down) throw new Error("simulated storage outage");
    return { ETag: '"v"', Body: { transformToString: async () => JSON.stringify({ ...defaultSiteContent, brandName: brand }) } };
  });
  return bucket;
}
const settle = () => new Promise((resolve) => setImmediate(resolve));

test("visitors within 30 seconds share one bucket read", async (t) => {
  const bucket = fakeBucket(t);
  assert.equal((await getSiteContent()).brandName, "第一版");
  t.mock.timers.tick(29_000);
  await getSiteContent(); await getSiteContentIfAvailable();
  assert.equal(bucket.reads, 1);
});

test("a visitor after 30 seconds is answered at once and the refresh happens behind them", async (t) => {
  const bucket = fakeBucket(t);
  await getSiteContent();
  bucket.brand = "第二版";
  let open; bucket.gate = new Promise((resolve) => { open = resolve; });
  t.mock.timers.tick(31_000);
  // Bucket 還沒回應，這位訪客已經拿到內容（舊的那份）。
  assert.equal((await getSiteContent()).brandName, "第一版");
  assert.equal((await getSiteContent()).brandName, "第一版");
  assert.equal(bucket.reads, 2, "同時間只重讀一次");
  open(); await settle();
  assert.equal((await getSiteContent()).brandName, "第二版");
  assert.equal(bucket.reads, 2);
});

test("content older than ten minutes is never served without re-reading", async (t) => {
  const bucket = fakeBucket(t);
  await getSiteContent();
  bucket.brand = "第二版";
  t.mock.timers.tick(10 * 60_000 + 1);
  assert.equal((await getSiteContent()).brandName, "第二版");
});

test("a save shows at once and a refresh that started earlier cannot undo it", async (t) => {
  const bucket = fakeBucket(t);
  await getSiteContent();
  let open; bucket.gate = new Promise((resolve) => { open = resolve; });
  t.mock.timers.tick(31_000);
  await getSiteContent(); // 背景重讀開始，讀到的會是儲存前的「第一版」
  await saveSiteContent({ ...defaultSiteContent, brandName: "剛存好" }, "staff@example.test", '"v"', null);
  assert.equal((await getSiteContent()).brandName, "剛存好");
  open(); await settle();
  assert.equal((await getSiteContent()).brandName, "剛存好");
});

test("during an outage pages keep the last content but the finder reports it unavailable", async (t) => {
  const bucket = fakeBucket(t);
  await getSiteContent();
  bucket.down = true;
  t.mock.timers.tick(31_000);
  assert.equal((await getSiteContentIfAvailable())?.brandName, "第一版", "重讀還沒失敗前照常");
  await settle();
  assert.equal(await getSiteContentIfAvailable(), null);
  assert.equal((await getSiteContent()).brandName, "第一版");
  await settle(); // 上一行順手觸發的背景重讀（仍在故障中）先結束
  bucket.down = false; bucket.brand = "恢復後";
  assert.equal((await getSiteContentIfAvailable())?.brandName, "恢復後");
});

test("a cold start with the bucket down fails the finder without throwing", async (t) => {
  const bucket = fakeBucket(t);
  bucket.down = true;
  assert.equal(await getSiteContentIfAvailable(), null);
});

test("edge cache headers cover public pages only and skip RSC requests", () => {
  const rules = edgeCacheHeaders();
  assert.deepEqual(rules.map((rule) => rule.source), edgeCachedPaths);
  for (const blocked of ["/studio", "/api", "/contact"]) assert.ok(!edgeCachedPaths.some((path) => path.startsWith(blocked)), blocked);
  for (const rule of rules) {
    assert.deepEqual(rule.missing, [{ type: "header", key: "rsc" }]);
    assert.deepEqual(rule.headers, [{ key: "Cloudflare-CDN-Cache-Control", value: `public, max-age=${edgeCacheSeconds}, stale-while-revalidate=${edgeCacheSeconds}` }]);
  }
  assert.ok(edgeCacheSeconds > 0 && edgeCacheSeconds <= 300, "存檔後前台要在幾分鐘內更新");
});
