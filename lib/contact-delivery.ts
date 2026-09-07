import "server-only";
import {
  listContactRequestObjects,
  readContactForNotification,
  updateContactNotification,
} from "./railway-storage";
import {
  isContactNotifyConfigured,
  notifyContactRequest,
} from "./contact-notify";
import { notificationDelay, notificationDue } from "./notification-policy";
import { getSiteContent } from "./site-content";

export async function deliverContact(key: string, manual = false) {
  if (!isContactNotifyConfigured()) throw new Error("尚未設定通知服務");
  const { value, etag } = await readContactForNotification(key);
  const current = value.notification;
  const now = Date.now();
  if (current?.state === "delivered") return current;
  if (current?.state === "sending" && current.nextAttemptAt > now)
    throw new Error("通知正在處理中，請稍後重新整理");
  if (!manual && !notificationDue(current, now)) return current;
  const { brandName } = await getSiteContent();
  // A conditional write leases the record across workers and deployments.
  const claimed = {
    state: "sending" as const,
    attempts: (manual ? 0 : (current?.attempts ?? 0)) + 1,
    nextAttemptAt: now + 120_000,
    line: current?.line ?? false,
    webhook: current?.webhook ?? false,
  };
  const claimedVersion = await updateContactNotification(
    key,
    { ...value, notification: claimed },
    etag,
  );
  const result = await notifyContactRequest(
    { ...value, notification: claimed },
    brandName,
  );
  const notification = {
    ...claimed,
    line: result.line,
    webhook: result.webhook,
    state: result.delivered ? ("delivered" as const) : ("failed" as const),
    nextAttemptAt: Date.now() + notificationDelay(claimed.attempts),
  };
  await updateContactNotification(
    key,
    { ...value, notification },
    claimedVersion,
  );
  return notification;
}

let running = false;
export async function retryContactNotifications() {
  if (running || !isContactNotifyConfigured()) return;
  running = true;
  try {
    const records = await listContactRequestObjects(Number.MAX_SAFE_INTEGER);
    const due = (records ?? [])
      .filter((record) =>
        notificationDue(
          (
            record.value as {
              notification?: Parameters<typeof notificationDue>[0];
            }
          )?.notification,
          Date.now(),
        ),
      )
      .slice(0, 10);
    for (const record of due) {
      try {
        await deliverContact(record.key);
      } catch (error) {
        console.error("Contact delivery retry failed", error);
      }
    }
  } finally {
    running = false;
  }
}
