import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("the finished travel site replaces all starter content", async () => {
  const [page, layout, content, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/site-content.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /精選行程/);
  assert.match(page, /TravelTools/);
  assert.match(page, /內容管理/);
  assert.match(content, /Found・旅行顧問/);
  assert.match(content, /東京慢旅 5日/);
  assert.match(content, /北海道花野 7日/);
  assert.match(content, /峇里島療癒 6日/);
  assert.match(layout, /Found・旅行顧問/);
  assert.doesNotMatch(page, /SkeletonPreview|codex-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  await access(new URL("../dist/server/index.js", import.meta.url));
  await assert.rejects(
    access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)),
  );
});
