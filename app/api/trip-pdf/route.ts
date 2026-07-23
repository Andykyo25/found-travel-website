import { NextRequest, NextResponse } from "next/server";
import { createTripPdfUrl } from "@/lib/railway-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key") ?? "";
  if (!/^trip-pdfs\/[A-Za-z0-9-]+\.pdf$/.test(key)) {
    return NextResponse.json({ error: "無效的 PDF 連結" }, { status: 400 });
  }

  const url = await createTripPdfUrl(key);
  if (!url) {
    return NextResponse.json({ error: "找不到這份 PDF" }, { status: 404 });
  }

  return NextResponse.redirect(url, 302);
}
