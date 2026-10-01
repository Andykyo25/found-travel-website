import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { defaultSiteContent, getSiteContentWithMeta, saveSiteContent } from "../lib/site-content.ts";
import { isRailwayStorageConfigured } from "../lib/railway-storage.ts";

test("design review reads a local snapshot, blocks saves, rejects broken files and is ignored in production", { skip: isRailwayStorageConfigured() }, async () => {
  const previousDirectory = process.cwd();
  const previousMode = process.env.NODE_ENV;
  const previousFlag = process.env.FOUND_DESIGN_PREVIEW;
  const directory = await mkdtemp(path.join(tmpdir(), "found-design-review-"));
  const work = path.join(directory, "work");
  const snapshot = path.join(work, "design-preview.json");
  await mkdir(work);
  await writeFile(snapshot, JSON.stringify({ trips: [{ ...defaultSiteContent.trips[0], id: "public-snapshot-trip" }] }));
  try {
    process.chdir(directory);
    process.env.NODE_ENV = "development";
    process.env.FOUND_DESIGN_PREVIEW = "1";
    const preview = await getSiteContentWithMeta();
    assert.equal(preview.content.trips[0].id, "public-snapshot-trip");
    assert.equal(preview.meta.etag, null);
    await assert.rejects(saveSiteContent(preview.content, "review@example.test", null, null), /不接受內容儲存/);
    process.env.NODE_ENV = "production";
    const production = await getSiteContentWithMeta();
    assert.equal(production.content.trips[0].id, defaultSiteContent.trips[0].id);
    process.env.NODE_ENV = "development";
    await writeFile(snapshot, "{broken");
    await assert.rejects(getSiteContentWithMeta(), SyntaxError);
  } finally {
    process.chdir(previousDirectory);
    if (previousMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousMode;
    if (previousFlag === undefined) delete process.env.FOUND_DESIGN_PREVIEW;
    else process.env.FOUND_DESIGN_PREVIEW = previousFlag;
    await unlink(snapshot);
    await rmdir(work);
    await rmdir(directory);
  }
});
