import { NextRequest, NextResponse } from "next/server";
import {
  isSameOriginRequest,
  requestOrigin,
  studioSessionCookie,
} from "@/lib/studio-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "無效的登出來源" }, { status: 403 });
  }

  const origin = requestOrigin(request);
  const response = NextResponse.redirect(
    new URL("/studio/login", origin),
    303,
  );
  response.cookies.set({
    name: studioSessionCookie,
    value: "",
    httpOnly: true,
    secure: origin.startsWith("https:"),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
