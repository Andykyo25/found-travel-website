import { NextRequest, NextResponse } from "next/server";
import { env } from "cloudflare:workers";

export const dynamic = "force-dynamic";

type StoredObject = {
  body: ReadableStream;
  customMetadata?: Record<string, string>;
  writeHttpMetadata?: (headers: Headers) => void;
};

function getFilesBucket() {
  return (
    env as unknown as {
      FILES?: {
        get: (key: string) => Promise<StoredObject | null>;
      };
    }
  ).FILES;
}

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key") ?? "";
  if (!/^trip-pdfs\/[A-Za-z0-9-]+\.pdf$/.test(key)) {
    return NextResponse.json({ error: "無效的 PDF 連結" }, { status: 400 });
  }

  const bucket = getFilesBucket();
  if (!bucket) {
    return NextResponse.json(
      { error: "檔案儲存空間尚未啟用" },
      { status: 503 },
    );
  }

  const object = await bucket.get(key);
  if (!object) {
    return NextResponse.json({ error: "找不到這份 PDF" }, { status: 404 });
  }

  const filename = object.customMetadata?.filename || "travel-itinerary.pdf";
  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  headers.set("content-type", "application/pdf");
  headers.set(
    "content-disposition",
    `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
  );
  headers.set("cache-control", "public, max-age=3600");
  headers.set("x-content-type-options", "nosniff");

  return new Response(object.body, { headers });
}
