import { NextRequest, NextResponse } from "next/server";
import {
  getStudioUserFromRequest,
  isSameOriginRequest,
} from "@/lib/studio-auth";
import {
  getSiteContentWithMeta,
  saveSiteContent,
  type SiteContent,
} from "@/lib/site-content";
import { cleanupOrphanedTripPdfs } from "@/lib/railway-storage";
import { tripPdfKeyFromDocumentUrl } from "@/lib/storage-keys";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function referencedTripPdfKeys(content: SiteContent) {
  const keys = new Set<string>();
  for (const trip of content.trips) {
    if (trip.documentType !== "pdf") continue;
    const key = tripPdfKeyFromDocumentUrl(trip.documentUrl);
    if (key) keys.add(key);
  }
  return keys;
}

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

  const baseUpdatedAt =
    typeof body === "object" &&
    body !== null &&
    typeof (body as { _baseUpdatedAt?: unknown })._baseUpdatedAt === "string"
      ? (body as { _baseUpdatedAt: string })._baseUpdatedAt
      : null;

  try {
    const { content: previousContent, meta } = await getSiteContentWithMeta();
    if (meta.updatedAt && meta.updatedAt !== baseUpdatedAt) {
      return NextResponse.json(
        {
          error: `內容已由 ${meta.updatedBy ?? "其他管理員"} 更新過，為避免互相覆蓋，請重新整理頁面取得最新內容後再編輯`,
        },
        { status: 409 },
      );
    }

    const saved = await saveSiteContent(body, user.email);
    const previousPdfKeys = referencedTripPdfKeys(previousContent);
    const referencedPdfKeys = referencedTripPdfKeys(saved.content);
    const retiredPdfKeys = new Set(
      [...previousPdfKeys].filter((key) => !referencedPdfKeys.has(key)),
    );

    let pdfCleanup = {
      deleted: 0,
      protectedRecent: 0,
      failed: false,
    };
    try {
      pdfCleanup = {
        ...(await cleanupOrphanedTripPdfs({
          referencedKeys: referencedPdfKeys,
          immediatelyRemoveKeys: retiredPdfKeys,
        })),
        failed: false,
      };
    } catch (error) {
      // 網站內容已經成功儲存，清理失敗不應讓管理員誤以為內容沒有發布。
      console.error("Unable to clean up orphaned trip PDFs", error);
      pdfCleanup.failed = true;
    }

    return NextResponse.json({
      content: saved.content,
      savedAt: saved.updatedAt,
      pdfCleanup,
    });
  } catch (error) {
    console.error("Unable to save site content", error);
    return NextResponse.json(
      { error: "暫時無法儲存，請稍後再試" },
      { status: 500 },
    );
  }
}
