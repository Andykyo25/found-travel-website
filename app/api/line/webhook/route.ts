import { NextResponse, type NextRequest } from "next/server";
import { pushTargetsFromEvents, verifyLineSignature } from "@/lib/line-webhook";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 用來取得 LINE_TARGET_ID：官方帳號在群組收到訊息時，把群組 ID 印到 Railway log。
// 不儲存、不回覆任何訊息；取得 ID 後可在 LINE Developers 關閉 webhook。
export async function POST(request: NextRequest) {
  const secret = process.env.LINE_CHANNEL_SECRET?.trim() ?? "";
  const rawBody = await request.text();
  if (!verifyLineSignature(rawBody, request.headers.get("x-line-signature"), secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  for (const target of pushTargetsFromEvents(body)) {
    console.log(`LINE webhook push target: ${target}`);
  }
  return NextResponse.json({ ok: true });
}
