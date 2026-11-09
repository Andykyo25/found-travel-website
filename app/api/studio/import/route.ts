import { NextRequest, NextResponse } from "next/server";
import { getStudioUserFromRequest, isSameOriginRequest } from "@/lib/studio-auth";
import { getSiteContentWithMeta, saveSiteContent, type Trip } from "@/lib/site-content";
import { isRailwayStorageConfigured } from "@/lib/railway-storage";
import { tripPdfKeyFromDocumentUrl } from "@/lib/storage-keys";
import { maxImportTrips, mergeImportedTrips } from "@/lib/trip-import";
import { tripDraftProblems, validateContentDraft } from "@/lib/trip-validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 批次匯入：把一批已經上傳好 PDF 的行程接在現有行程後面。
// 在伺服器端讀最新內容再合併，業務不用先重新整理；同一個行程編號不會重複加入，中斷後重跑是安全的。
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "無效的操作來源" }, { status: 403 });
  }
  const user = getStudioUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  if (!isRailwayStorageConfigured()) {
    return NextResponse.json({ error: "檔案儲存空間尚未啟用" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "匯入資料格式不正確" }, { status: 400 });
  }
  const incoming = (body as { trips?: unknown })?.trips;
  if (!Array.isArray(incoming) || incoming.length === 0 || incoming.length > maxImportTrips) {
    return NextResponse.json({ error: "沒有可匯入的行程" }, { status: 400 });
  }

  // 每個行程都要資料齊全，而且每個版本都附上剛上傳的 PDF；不齊的整批退回，網站內容不變。
  for (const item of incoming) {
    const trip = (item ?? {}) as Trip;
    const name = typeof trip.title === "string" && trip.title.trim() ? trip.title.trim() : "未命名行程";
    const problems = tripDraftProblems(trip);
    if (typeof trip.id !== "string" || problems.length > 0) {
      return NextResponse.json({ error: `「${name}」資料不完整：${problems.join("、") || "缺少行程編號"}` }, { status: 400 });
    }
    if (!Array.isArray(trip.plans) || trip.plans.some((plan) => !tripPdfKeyFromDocumentUrl(String(plan?.documentUrl ?? "")))) {
      return NextResponse.json({ error: `「${name}」有版本的 PDF 沒有上傳成功，請重新匯入` }, { status: 400 });
    }
  }

  // 剛好有人同時儲存時重讀一次再合併。
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const { content: previous, meta } = await getSiteContentWithMeta();
      const merged = mergeImportedTrips(previous.trips, incoming as Trip[]);
      if (merged.added.length === 0) {
        return NextResponse.json({ added: 0, alreadyThere: merged.alreadyThere.length, savedAt: meta.updatedAt });
      }
      const draft = { ...previous, trips: merged.trips };
      const invalid = validateContentDraft(draft);
      if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

      const saved = await saveSiteContent(draft, user.email, meta.etag, {
        ...previous,
        _updatedAt: meta.updatedAt,
        _updatedBy: meta.updatedBy,
      });
      return NextResponse.json({ added: merged.added.length, alreadyThere: merged.alreadyThere.length, savedAt: saved.updatedAt });
    } catch (error) {
      const conflict =
        error && typeof error === "object" && "name" in error &&
        ["PreconditionFailed", "ConditionalRequestConflict"].includes(String(error.name));
      if (conflict && attempt === 0) continue;
      console.error("Unable to import trips", error);
      return NextResponse.json(
        { error: conflict ? "內容剛好有人在儲存，請稍後再按一次匯入" : "暫時無法儲存，請稍後再試" },
        { status: conflict ? 409 : 500 },
      );
    }
  }
  return NextResponse.json({ error: "暫時無法儲存，請稍後再試" }, { status: 500 });
}
