import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { pushTargetsFromEvents, verifyLineSignature } from "../lib/line-webhook.ts";

const secret = "test-channel-secret";
const sign = (body) => createHmac("sha256", secret).update(body).digest("base64");

test("LINE webhook accepts only bodies signed with the channel secret", () => {
  const body = JSON.stringify({ destination: "U1", events: [] });
  assert.equal(verifyLineSignature(body, sign(body), secret), true);
  assert.equal(verifyLineSignature(`${body} `, sign(body), secret), false);
  assert.equal(verifyLineSignature(body, sign(body), "other-secret"), false);
  assert.equal(verifyLineSignature(body, null, secret), false);
  assert.equal(verifyLineSignature(body, "not-base64!!", secret), false);
  assert.equal(verifyLineSignature(body, sign(body), ""), false);
});

test("LINE webhook reports group and room IDs without message content", () => {
  const targets = pushTargetsFromEvents({
    events: [
      { type: "message", source: { type: "group", groupId: "Cgroup1", userId: "Uuser" }, message: { text: "hi" } },
      { type: "message", source: { type: "group", groupId: "Cgroup1" } },
      { type: "join", source: { type: "room", roomId: "Rroom1" } },
      { type: "follow", source: { type: "user", userId: "Uuser" } },
    ],
  });
  assert.deepEqual(targets, ["group Cgroup1", "room Rroom1"]);
  assert.deepEqual(pushTargetsFromEvents(null), []);
  assert.deepEqual(pushTargetsFromEvents({ events: "x" }), []);
});
