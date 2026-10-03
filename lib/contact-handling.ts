// 聯絡單的處理狀態（待處理／已聯絡）。純函式，前後台與測試共用，
// 因此不可加上 "server-only"。
import type { ContactHandling, ContactRequest } from "./contact-fields";

export type ContactHandlingState = "new" | "contacted";

export const contactHandlingBatchLimit = 300;

export function isContactHandlingState(
  value: unknown,
): value is ContactHandlingState {
  return value === "new" || value === "contacted";
}

export function parseContactHandling(value: unknown): ContactHandling | undefined {
  if (typeof value !== "object" || !value) return undefined;
  const source = value as Record<string, unknown>;
  if (typeof source.at !== "string" || Number.isNaN(Date.parse(source.at))) {
    return undefined;
  }
  return {
    by: typeof source.by === "string" ? source.by.slice(0, 254) : "",
    at: source.at,
  };
}

export function applyContactHandling<T extends ContactRequest>(
  value: T,
  state: ContactHandlingState,
  by: string,
  now: Date = new Date(),
): T {
  const rest = { ...value };
  delete rest.handling;
  return state === "contacted"
    ? { ...rest, handling: { by: by.slice(0, 254), at: now.toISOString() } }
    : rest;
}

export function countContactHandling(requests: Array<Pick<ContactRequest, "handling">>) {
  const contacted = requests.filter((request) => request.handling).length;
  return { contacted, pending: requests.length - contacted };
}

// 顯示用：只取 Email 的 @ 之前，避免整排都是網域。
export function handlerLabel(by: string) {
  const name = by.split("@")[0]?.trim();
  return name || "同事";
}
