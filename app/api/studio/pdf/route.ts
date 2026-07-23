import { NextRequest, NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { claimOrCheckEditor } from "@/lib/site-content";

export const dynamic = "force-dynamic";

const maxPdfBytes = 25 * 1024 * 1024;

function getFilesBucket() {
  return (
    env as unknown as {
      FILES?: {
        put: (
          key: string,
          value: ReadableStream | ArrayBuffer,
          options?: {
            httpMetadata?: { contentType?: string };
            customMetadata?: Record<string, string>;
          },
        ) => Promise<unknown>;
      };
    }
  ).FILES;
}

export async function POST(request: NextRequest) {
  const user = await getChatGPTUser();
  if (!user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  if (!(await claimOrCheckEditor(user.email))) {
    return NextResponse.json({ error: "沒有編輯權限" }, { status: 403 });
  }

  const bucket = getFilesBucket();
  if (!bucket) {
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

  const key = `trip-pdfs/${Date.now()}-${crypto.randomUUID()}.pdf`;
  await bucket.put(key, file.stream(), {
    httpMetadata: { contentType: "application/pdf" },
    customMetadata: {
      filename: file.name.slice(0, 240),
      uploadedBy: user.email.slice(0, 240),
    },
  });

  return NextResponse.json({
    url: `/api/trip-pdf?key=${encodeURIComponent(key)}`,
    filename: file.name,
  });
}
