import { NextRequest, NextResponse } from "next/server";
import {
  clearLoginFailures,
  createStudioSession,
  isSameOriginRequest,
  isStudioAuthConfigured,
  loginRetryAfter,
  recordLoginFailure,
  studioSessionCookie,
  studioSessionMaxAge,
  verifyStudioCredentials,
} from "@/lib/studio-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "無效的登入來源" }, { status: 403 });
  }

  let input: { email?: unknown; password?: unknown };
  try {
    input = (await request.json()) as typeof input;
  } catch {
    return NextResponse.json({ error: "登入資料格式不正確" }, { status: 400 });
  }

  const email = typeof input.email === "string" ? input.email.slice(0, 254) : "";
  const password =
    typeof input.password === "string" ? input.password.slice(0, 512) : "";

  if (!isStudioAuthConfigured()) {
    return NextResponse.json(
      { error: "後台登入尚未完成設定，請聯絡網站管理者" },
      { status: 503 },
    );
  }

  const retryAfter = loginRetryAfter(request, email);
  if (retryAfter > 0) {
    return NextResponse.json(
      { error: "登入嘗試次數過多，請稍後再試" },
      { status: 429, headers: { "retry-after": String(retryAfter) } },
    );
  }

  if (!verifyStudioCredentials(email, password)) {
    recordLoginFailure(request, email);
    return NextResponse.json(
      { error: "Email 或密碼不正確" },
      { status: 401 },
    );
  }

  clearLoginFailures(request, email);
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: studioSessionCookie,
    value: createStudioSession(email),
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: studioSessionMaxAge,
  });
  return response;
}
