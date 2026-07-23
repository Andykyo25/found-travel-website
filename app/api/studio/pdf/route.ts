import { NextRequest, NextResponse } from "next/server";
import {
  getStudioUserFromRequest,
  isSameOriginRequest,
} from "@/lib/studio-auth";
import {
  isRailwayStorageConfigured,
  uploadTripPdf,
} from "@/lib/railway-storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const maxPdfBytes = 25 * 1024 * 1024;

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "無效的操作來源" }, { status: 403 });
  }

  const user = getStudioUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  if (!isRailwayStorageConfigured()) {
    return NextResponse.json(
      { error: "檔案儲存空間尚未啟用" },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "無法讀取上傳檔案" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "請選擇 PDF 檔案" }, { status: 400 });
  }

  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return NextResponse.json(
      { error: "只接受 PDF 格式的檔案" },
      { status: 415 },
    );
  }

  if (file.size <= 0 || file.size > maxPdfBytes) {
    return NextResponse.json(
      { error: "PDF 檔案需小於 25 MB" },
      { status: 413 },
    );
  }

  try {
    const uploadedKey = await uploadTripPdf(
      new Uint8Array(await file.arrayBuffer()),
      file.name,
      user.email,
    );

    return NextResponse.json({
      url: `/api/trip-pdf?key=${encodeURIComponent(uploadedKey)}`,
      filename: file.name,
    });
  } catch (error) {
    console.error("Unable to upload PDF", error);
    return NextResponse.json(
      { error: "PDF 上傳失敗，請稍後再試" },
      { status: 500 },
    );
  }
}
