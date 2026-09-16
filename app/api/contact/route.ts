import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { deliverContact } from "@/lib/contact-delivery";
import type { ManagedContactRequest } from "@/lib/contact-fields";
import {
  parseContactRequestInput,
  saveContactRequest,
} from "@/lib/contact-requests";
import { isRailwayStorageConfigured } from "@/lib/railway-storage";
import { isSameOriginRequest } from "@/lib/studio-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 公開端點，用單機記憶體限制同一來源的送出頻率，擋掉表單機器人。
const submitWindowMs = 10 * 60 * 1000;
const maxSubmitsPerWindow = 5;

type SubmitAttempt = { count: number; windowStartedAt: number };

const submitAttempts =
  (
    globalThis as typeof globalThis & {
      foundTravelContactAttempts?: Map<string, SubmitAttempt>;
    }
  ).foundTravelContactAttempts ?? new Map<string, SubmitAttempt>();

(
  globalThis as typeof globalThis & {
    foundTravelContactAttempts?: Map<string, SubmitAttempt>;
  }
).foundTravelContactAttempts = submitAttempts;

function clientKey(request: NextRequest) {
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  return createHash("sha256").update(ip).digest("base64url");
}

function isRateLimited(request: NextRequest) {
  const key = clientKey(request);
  const now = Date.now();
  const current = submitAttempts.get(key);

  if (!current || now - current.windowStartedAt > submitWindowMs) {
    submitAttempts.set(key, { count: 1, windowStartedAt: now });
    return false;
  }

  current.count += 1;
  return current.count > maxSubmitsPerWindow;
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "無效的送出來源" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "表單格式不正確" }, { status: 400 });
  }

  // 蜜罐欄位：一般客人看不到也不會填，填了就是機器人。
  if (
    typeof body === "object" &&
    body !== null &&
    typeof (body as { company?: unknown }).company === "string" &&
    (body as { company: string }).company.trim()
  ) {
    return NextResponse.json({ ok: true });
  }

  const parsed = parseContactRequestInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  if (isRateLimited(request)) {
    return NextResponse.json(
      { error: "送出次數過多，請稍後再試或直接透過 LINE 聯絡我們" },
      { status: 429 },
    );
  }

  if (!isRailwayStorageConfigured()) {
    return NextResponse.json(
      { error: "表單服務尚未啟用，請直接透過 LINE 聯絡我們" },
      { status: 503 },
    );
  }

  let saved: ManagedContactRequest;
  const token = (body as { submissionId?: unknown }).submissionId;
  if (token !== undefined && (typeof token !== "string" || !/^\d{13}-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token) || Number(token.slice(0, 13)) > Date.now() + 60000 || Number(token.slice(0, 13)) < Date.now() - 7 * 86400000)) {
    return NextResponse.json({ error: "表單已過期，請重新開啟後送出" }, { status: 400 });
  }
  try {
    saved = await saveContactRequest(parsed.request, typeof token === "string" ? token : undefined);
  } catch (error) {
    console.error("Unable to save contact request", error);
    return NextResponse.json(
      { error: "暫時無法送出，請稍後再試或直接透過 LINE 聯絡我們" },
      { status: 500 },
    );
  }

  after(async () => {
    try {
      await deliverContact(saved.storageKey);
    } catch (error) {
      console.error("Contact queued for retry", error);
    }
  });

  return NextResponse.json({ ok: true });
}
