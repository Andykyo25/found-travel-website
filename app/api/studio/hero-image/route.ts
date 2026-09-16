import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getStudioUserFromRequest, isSameOriginRequest } from "@/lib/studio-auth";
import { isRailwayStorageConfigured, uploadHeroImage } from "@/lib/railway-storage";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "無效的操作來源" }, { status: 403 });
  if (!getStudioUserFromRequest(request)) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  if (!isRailwayStorageConfigured()) return NextResponse.json({ error: "照片儲存空間尚未啟用，請先使用圖片網址" }, { status: 503 });
  const limit = 8 * 1024 * 1024;
  if (Number(request.headers.get("content-length")) > limit + 65536) return NextResponse.json({ error: "照片需小於 8 MB" }, { status: 413 });
  let bytes: Buffer;
  try {
    const file = (await request.formData()).get("file");
    if (!(file instanceof File) || !file.size || file.size > limit) return NextResponse.json({ error: "請選擇 8 MB 以內的照片" }, { status: 400 });
    const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40000000 });
    const meta = await image.metadata();
    if (!meta.format || !["jpeg", "png", "webp"].includes(meta.format)) throw new Error("format");
    bytes = await image.rotate().resize({ width: 2400, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
  } catch { return NextResponse.json({ error: "無法讀取照片，請使用 JPG、PNG 或 WebP" }, { status: 400 }); }
  try {
    const key = await uploadHeroImage(bytes);
    return NextResponse.json({ url: `/api/hero-image?key=${encodeURIComponent(key)}` });
  } catch { return NextResponse.json({ error: "照片上傳失敗，請稍後再試" }, { status: 503 }); }
}
