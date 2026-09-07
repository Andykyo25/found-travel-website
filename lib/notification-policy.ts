import type { ContactRequest } from "./contact-fields";
export function notificationDue(
  notification: ContactRequest["notification"],
  now: number,
) {
  return Boolean(
    notification &&
      notification.state !== "delivered" &&
      notification.attempts < 5 &&
      notification.nextAttemptAt <= now,
  );
}
export function notificationDelay(attempts: number) {
  return Math.min(60 * 60_000, 60_000 * 2 ** Math.max(0, attempts - 1));
}
