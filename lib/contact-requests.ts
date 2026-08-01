import "server-only";

import {
  contactTimeSlots,
  type ContactRequest,
  type ContactTimeSlotId,
} from "@/lib/contact-fields";
import {
  listContactRequestObjects,
  writeContactRequestObject,
} from "@/lib/railway-storage";

const timeSlotIds = new Set<string>(contactTimeSlots.map((slot) => slot.id));

export type ContactRequestInput = {
  ok: true;
  request: Omit<ContactRequest, "id" | "createdAt">;
};

export type ContactRequestInputError = {
  ok: false;
  error: string;
};

export function parseContactRequestInput(
  value: unknown,
): ContactRequestInput | ContactRequestInputError {
  const input =
    typeof value === "object" && value
      ? (value as Record<string, unknown>)
      : {};

  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) return { ok: false, error: "請填寫聯絡人姓名" };
  if (name.length > 60) return { ok: false, error: "聯絡人姓名過長" };

  const mobile = typeof input.mobile === "string" ? input.mobile.trim() : "";
  const mobileDigits = mobile.replace(/\D/g, "");
  if (!mobile) return { ok: false, error: "請填寫行動電話" };
  if (mobile.length > 40 || mobileDigits.length < 8) {
    return { ok: false, error: "行動電話格式不正確" };
  }

  const preferredTimesSource = Array.isArray(input.preferredTimes)
    ? input.preferredTimes
    : [];
  const preferredTimes = contactTimeSlots
    .map((slot) => slot.id)
    .filter((id) => preferredTimesSource.includes(id));
  if (preferredTimes.length === 0) {
    return { ok: false, error: "請選擇希望聯繫時段" };
  }

  const message = typeof input.message === "string" ? input.message.trim() : "";
  if (!message) return { ok: false, error: "請填寫諮詢內容" };
  if (message.length > 1000) {
    return { ok: false, error: "諮詢內容請控制在 1000 字以內" };
  }

  return {
    ok: true,
    request: { name, mobile, preferredTimes, message },
  };
}

function normalizeContactRequest(value: unknown): ContactRequest | null {
  if (typeof value !== "object" || !value) return null;
  const source = value as Record<string, unknown>;

  const id = typeof source.id === "string" ? source.id : "";
  const name = typeof source.name === "string" ? source.name : "";
  const createdAt =
    typeof source.createdAt === "string" ? source.createdAt : "";
  if (!id || !name || !createdAt) return null;

  const preferredTimesSource = Array.isArray(source.preferredTimes)
    ? source.preferredTimes
    : [];

  return {
    id,
    name,
    mobile: typeof source.mobile === "string" ? source.mobile : "",
    preferredTimes: preferredTimesSource.filter(
      (slot): slot is ContactTimeSlotId =>
        typeof slot === "string" && timeSlotIds.has(slot),
    ),
    message: typeof source.message === "string" ? source.message : "",
    createdAt,
  };
}

export async function saveContactRequest(
  request: Omit<ContactRequest, "id" | "createdAt">,
): Promise<ContactRequest> {
  const saved: ContactRequest = {
    ...request,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  await writeContactRequestObject(saved.id, saved);
  return saved;
}

export const contactRequestListLimit = 300;

// storageReady 為 false 代表尚未設定 Railway Bucket（例如本機預覽）。
export async function getContactRequests(): Promise<{
  requests: ContactRequest[];
  storageReady: boolean;
}> {
  try {
    const stored = await listContactRequestObjects(contactRequestListLimit);
    if (!stored) return { requests: [], storageReady: false };

    const requests = stored
      .map(normalizeContactRequest)
      .filter((request): request is ContactRequest => request !== null)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

    return { requests, storageReady: true };
  } catch (error) {
    console.error("Unable to list contact requests", error);
    return { requests: [], storageReady: true };
  }
}
