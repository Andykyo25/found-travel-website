import assert from "node:assert/strict";
import test from "node:test";
import { S3Client } from "@aws-sdk/client-s3";
import { deliverContact } from "../lib/contact-delivery.ts";
import { defaultSiteContent } from "../lib/site-content.ts";

test("delivery persists partial success, retries only failed channels and does not resend delivered contacts", async (t) => {
  t.mock.property(process, "env", {
    ...process.env,
    BUCKET_NAME: "test",
    BUCKET_ENDPOINT: "https://example.invalid",
    BUCKET_ACCESS_KEY_ID: "test",
    BUCKET_SECRET_ACCESS_KEY: "test",
    LINE_CHANNEL_ACCESS_TOKEN: "test",
    LINE_TARGET_ID: "test",
    CONTACT_WEBHOOK_URL: "https://webhook.invalid/",
  });
  const id = "11111111-1111-4111-8111-111111111111";
  const key = `contact-requests/1788796800000-${id}.json`;
  let value = {
    id,
    name: "Test",
    mobile: "0900000000",
    preferredTimes: ["anytime"],
    message: "Test only",
    createdAt: "2026-09-07T00:00:00Z",
    notification: {
      state: "pending",
      attempts: 0,
      nextAttemptAt: 0,
      line: false,
      webhook: false,
    },
  };
  let version = 1;
  t.mock.method(S3Client.prototype, "send", async (command) => {
    if (command.constructor.name === "GetObjectCommand")
      return {
        ETag: `"${version}"`,
        Body: {
          transformToString: async () =>
            JSON.stringify(
              command.input.Key === key ? value : defaultSiteContent,
            ),
        },
      };
    assert.equal(command.input.Key, key);
    if (command.input.IfMatch !== `"${version}"`)
      throw Object.assign(new Error("conflict"), {
        name: "PreconditionFailed",
      });
    value = JSON.parse(command.input.Body);
    return { ETag: `"${++version}"` };
  });
  const calls = [];
  let webhookFails = true;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    if (url === "https://api.line.me/v2/bot/message/push") {
      assert.equal(options.headers["x-line-retry-key"], id);
      return new Response("{}", { status: 200 });
    }
    assert.equal(url, "https://webhook.invalid/");
    assert.equal(options.headers["idempotency-key"], id);
    return new Response("{}", { status: webhookFails ? 503 : 200 });
  });
  t.mock.method(console, "error", () => {});
  const attempts = await Promise.allSettled([
    deliverContact(key),
    deliverContact(key),
  ]);
  assert.equal(attempts.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(value.notification.state, "failed");
  assert.equal(value.notification.line, true);
  assert.equal(value.notification.webhook, false);
  assert.equal(calls.length, 2);
  webhookFails = false;
  value.notification.nextAttemptAt = 0;
  await deliverContact(key);
  assert.equal(value.notification.state, "delivered");
  assert.equal(calls.length, 3);
  await deliverContact(key, true);
  assert.equal(calls.length, 3);
});
