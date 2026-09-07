import { validateTripDates } from "@/lib/trip-validation";
import { NextRequest, NextResponse } from "next/server";
import {
  getStudioUserFromRequest,
  isSameOriginRequest,
} from "@/lib/studio-auth";
import { getSiteContentWithMeta, saveSiteContent } from "@/lib/site-content";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

  const invalid = validateTripDates(body);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

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

    const saved = await saveSiteContent(body, user.email, meta.etag, {
      ...previousContent,
      _updatedAt: meta.updatedAt,
      _updatedBy: meta.updatedBy,
    });
    // Keep retired PDFs so history snapshots and concurrent drafts remain restorable.
    const pdfCleanup = { deleted: 0, protectedRecent: 0, failed: false };
    return NextResponse.json({
      content: saved.content,
      savedAt: saved.updatedAt,
      pdfCleanup,
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      ["PreconditionFailed", "ConditionalRequestConflict"].includes(
        String(error.name),
      )
    ) {
      return NextResponse.json(
        { error: "內容已由其他管理員更新，請重新整理後再儲存" },
        { status: 409 },
      );
    }
    console.error("Unable to save site content", error);
    return NextResponse.json(
      { error: "暫時無法儲存，請稍後再試" },
      { status: 500 },
    );
  }
}
