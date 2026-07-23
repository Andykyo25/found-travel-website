import { NextRequest, NextResponse } from "next/server";
import {
  getStudioUserFromRequest,
  isSameOriginRequest,
} from "@/lib/studio-auth";
import {
  normalizeSiteContent,
  saveSiteContent,
} from "@/lib/site-content";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PUT(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "無效的操作來源" }, { status: 403 });
  }

  const user = getStudioUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "內容格式不正確" }, { status: 400 });
  }

  try {
    const content = normalizeSiteContent(body);
    const saved = await saveSiteContent(content, user.email);
    return NextResponse.json({ content: saved, savedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Unable to save site content", error);
    return NextResponse.json(
      { error: "暫時無法儲存，請稍後再試" },
      { status: 500 },
    );
  }
}
