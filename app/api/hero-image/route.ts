import { NextRequest, NextResponse } from "next/server";
import { readHeroImage } from "@/lib/railway-storage";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key") ?? "";
  if (!/^hero-images\/[0-9a-f-]{36}\.webp$/.test(key)) return new NextResponse(null, { status: 400 });
  try {
    const bytes = await readHeroImage(key);
    if (!bytes) return new NextResponse(null, { status: 404 });
    return new NextResponse(new Uint8Array(bytes), { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
  } catch { return new NextResponse(null, { status: 503 }); }
}
