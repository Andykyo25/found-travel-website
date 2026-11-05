import { NextRequest, NextResponse } from "next/server";
import { getStudioUserFromRequest } from "@/lib/studio-auth";
import { isTripPdfKey } from "@/lib/storage-keys";
import { getTripPdfTextStatus } from "@/lib/trip-pdf-content";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 後台查看某份行程 PDF 自動整理出的每日行程。只讀取；還沒整理過會在背景開始整理。
export async function GET(request: NextRequest) {
  if (!getStudioUserFromRequest(request)) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }
  const key = request.nextUrl.searchParams.get("key");
  if (!isTripPdfKey(key)) {
    return NextResponse.json({ error: "找不到這份 PDF" }, { status: 400 });
  }
  return NextResponse.json(await getTripPdfTextStatus(key), {
    headers: { "Cache-Control": "no-store" },
  });
}
