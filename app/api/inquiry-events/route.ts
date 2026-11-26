import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { inquiryEventKey, isInquiryKind, normalizeInquiryPath } from "@/lib/inquiry-events";
import { taipeiDate } from "@/lib/news";
import { writeInquiryEventObject } from "@/lib/railway-storage";
import { isSameOriginRequest } from "@/lib/studio-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 公開端點：只接受本站送來的、合法的頁面路徑；同一來源 10 分鐘最多 30 筆，整台每天最多 5,000 筆。
// IP 只拿來算頻率（雜湊後留在記憶體），不會寫進儲存空間。
const windowMs = 10 * 60 * 1000;
const perClient = 30;
const perDay = 5000;
const state = (globalThis as typeof globalThis & {
  foundInquiryLimits?: { clients: Map<string, { count: number; since: number }>; day: string; total: number };
}).foundInquiryLimits ??= { clients: new Map(), day: "", total: 0 };

function limited(request: NextRequest, today: string) {
  if (state.day !== today) {
    state.day = today;
    state.total = 0;
    state.clients.clear();
  }
  if (++state.total > perDay) return true;
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const key = createHash("sha256").update(ip).digest("base64url");
  const now = Date.now();
  const current = state.clients.get(key);
  if (!current || now - current.since > windowMs) {
    state.clients.set(key, { count: 1, since: now });
    return false;
  }
  return ++current.count > perClient;
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return new NextResponse(null, { status: 403 });
  const raw = await request.text();
  if (raw.length > 300) return new NextResponse(null, { status: 400 });
  let kind: unknown;
  let path: string | null = null;
  try {
    const body = JSON.parse(raw) as { kind?: unknown; path?: unknown };
    kind = body.kind;
    path = normalizeInquiryPath(body.path);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  if (!isInquiryKind(kind) || !path) return new NextResponse(null, { status: 400 });

  const now = Date.now();
  const today = taipeiDate(new Date(now));
  if (limited(request, today)) return new NextResponse(null, { status: 429 });

  try {
    await writeInquiryEventObject(inquiryEventKey(today, kind, path, now, randomUUID()));
  } catch (error) {
    console.error("Unable to record inquiry event", error);
  }
  return new NextResponse(null, { status: 204 });
}
