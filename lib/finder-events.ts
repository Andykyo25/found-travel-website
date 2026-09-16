export const finderEvents = ["view", "start", "complete", "no_results", "contact_saved"] as const;
export type FinderEvent = typeof finderEvents[number];
// No contact text, URL query parameters, customer identifiers or phone numbers.
export function recordFinderEvent(event: FinderEvent) {
  void fetch("/api/finder-events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event }), keepalive: true }).catch(() => {});
}
