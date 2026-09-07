import assert from "node:assert/strict";
import test from "node:test";
import { S3Client } from "@aws-sdk/client-s3";
import {
  readSiteContentObject,
  writeSiteContentObject,
} from "../lib/railway-storage.ts";
import {
  defaultSiteContent,
  getSiteContent,
  getSiteContentWithMeta,
} from "../lib/site-content.ts";

test("conditional content writes reject concurrent overwrites and preserve snapshots", async (t) => {
  t.mock.property(process, "env", {
    ...process.env,
    BUCKET_NAME: "test",
    BUCKET_ENDPOINT: "https://example.invalid",
    BUCKET_ACCESS_KEY_ID: "test",
    BUCKET_SECRET_ACCESS_KEY: "test",
  });
  const key = "content/site-content.json";
  const objects = new Map([[key, { etag: '"v1"', value: defaultSiteContent }]]);
  let revision = 1;
  let unavailable = false;
  t.mock.method(S3Client.prototype, "send", async (command) => {
    if (unavailable) throw new Error("simulated storage outage");
    const input = command.input;
    const current = objects.get(input.Key);
    if (command.constructor.name === "GetObjectCommand") {
      if (!current) throw Object.assign(new Error(), { name: "NoSuchKey" });
      return {
        ETag: current.etag,
        Body: { transformToString: async () => JSON.stringify(current.value) },
      };
    }
    assert.equal(command.constructor.name, "PutObjectCommand");
    if (
      (input.IfMatch && current?.etag !== input.IfMatch) ||
      (input.IfNoneMatch === "*" && current)
    )
      throw Object.assign(new Error("conflict"), {
        name: "PreconditionFailed",
      });
    objects.set(input.Key, {
      etag: `"v${++revision}"`,
      value: JSON.parse(input.Body),
    });
    return { ETag: objects.get(input.Key).etag };
  });
  const original = await readSiteContentObject();
  const writes = await Promise.allSettled([
    writeSiteContentObject(
      { ...defaultSiteContent, brandName: "A" },
      original.etag,
      original.value,
    ),
    writeSiteContentObject(
      { ...defaultSiteContent, brandName: "B" },
      original.etag,
      original.value,
    ),
  ]);
  assert.equal(writes.filter((w) => w.status === "fulfilled").length, 1);
  assert.equal(
    writes.find((w) => w.status === "rejected").reason.name,
    "PreconditionFailed",
  );
  assert.equal(
    [...objects.keys()].filter((key) => key.startsWith("content-history/"))
      .length,
    2,
  );
  const lastGood = await getSiteContent();
  unavailable = true;
  await assert.rejects(getSiteContentWithMeta(), /outage/);
  t.mock.method(console, "error", () => {});
  assert.equal((await getSiteContent()).brandName, lastGood.brandName);
});
