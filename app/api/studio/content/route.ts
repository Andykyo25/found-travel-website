import { NextRequest, NextResponse } from "next/server";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import {
  claimOrCheckEditor,
  normalizeSiteContent,
  saveSiteContent,
} from "@/lib/site-content";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest) {
  const user = await getChatGPTUser();
  if (!user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const canEdit = await claimOrCheckEditor(user.email);
  if (!canEdit) {
    return NextResponse.json({ error: "沒有編輯權限" }, { status: 403 });
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
  } catch {
    return NextResponse.json(
      { error: "暫時無法儲存，請稍後再試" },
      { status: 500 },
    );
  }
}
