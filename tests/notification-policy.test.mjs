import assert from "node:assert/strict";
import test from "node:test";
import {
  notificationDue,
  notificationDelay,
} from "../lib/notification-policy.ts";

test("retry selection respects leases, delivery, attempt limits and legacy contacts", () => {
  assert.equal(notificationDue(undefined, 1000), false);
  for (const state of ["pending", "failed", "sending"]) {
    assert.equal(
      notificationDue({ state, attempts: 1, nextAttemptAt: 1000 }, 1000),
      true,
    );
    assert.equal(
      notificationDue({ state, attempts: 1, nextAttemptAt: 1001 }, 1000),
      false,
    );
  }
  assert.equal(
    notificationDue(
      { state: "delivered", attempts: 1, nextAttemptAt: 0 },
      1000,
    ),
    false,
  );
  assert.equal(
    notificationDue({ state: "failed", attempts: 5, nextAttemptAt: 0 }, 1000),
    false,
  );
  assert.deepEqual(
    [1, 2, 3, 4].map(notificationDelay),
    [60000, 120000, 240000, 480000],
  );
});
