import { NextRequest, NextResponse } from "next/server";
import { deleteContactRequestObject } from "@/lib/railway-storage";
import { isContactRequestKey } from "@/lib/storage-keys";
import {
  getStudioUserFromRequest,
  isSameOriginRequest,
} from "@/lib/studio-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function DELETE(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "無效的操作來源" }, { status: 403 });
  }

  const user = getStudioUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  let body: { key?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "刪除資料格式不正確" }, { status: 400 });
  }

  if (!isContactRequestKey(body.key)) {
    return NextResponse.json({ error: "無效的聯絡表單識別碼" }, { status: 400 });
  }

  try {
    await deleteContactRequestObject(body.key);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to delete contact request", error);
    return NextResponse.json(
      { error: "暫時無法刪除，請稍後再試" },
      { status: 500 },
    );
  }
}
