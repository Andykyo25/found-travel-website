import { NextRequest, NextResponse } from "next/server";
import { getStudioUserFromRequest, isSameOriginRequest } from "@/lib/studio-auth";
import { getSiteContentWithMeta } from "@/lib/site-content";
import { drivePlanKey, isDriveFileId } from "@/lib/drive-pdf";
import { readDriveFiles, saveDrivePdfLink } from "@/lib/drive-pdf-store";
import { isDrivePdfSyncRunning, replacePlanWithDrive, syncDrivePdfs } from "@/lib/drive-pdf-sync";
import { isTourFeedConfigured, TourFeedError } from "@/lib/tour-feed-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const idPattern = /^[A-Za-z0-9_-]{1,120}$/;
const failure = (error: unknown, fallback: string) => (error instanceof TourFeedError ? error.message : fallback);

// 後台「PDF 同步」頁：立即同步、指定某個方案對到 Drive 上哪個檔、改用 Drive 版本。
// 只改官網這邊的紀錄；業務系統與 Drive 一律只讀。
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "無效的操作來源" }, { status: 403 });
  if (!getStudioUserFromRequest(request)) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  let input: { action?: unknown; tripId?: unknown; planId?: unknown; driveId?: unknown };
  try {
    input = (await request.json()) as typeof input;
  } catch {
    return NextResponse.json({ error: "資料格式不正確" }, { status: 400 });
  }

  if (input.action === "sync") {
    if (!isTourFeedConfigured()) return NextResponse.json({ error: "尚未設定業務系統的連線資訊" }, { status: 503 });
    if (isDrivePdfSyncRunning()) return NextResponse.json({ started: false, running: true });
    // 第一次同步要比對幾百份 PDF，可能要好幾分鐘：在背景跑，頁面稍後重新整理就看得到結果。
    void syncDrivePdfs().catch((error) => console.error("Drive PDF sync failed", error));
    return NextResponse.json({ started: true }, { status: 202 });
  }

  const tripId = typeof input.tripId === "string" && idPattern.test(input.tripId) ? input.tripId : "";
  const planId = typeof input.planId === "string" && idPattern.test(input.planId) ? input.planId : "";
  if (!tripId || !planId) return NextResponse.json({ error: "資料格式不正確" }, { status: 400 });
  const { content } = await getSiteContentWithMeta();
  const plan = content.trips.find((trip) => trip.id === tripId)?.plans.find((item) => item.id === planId);
  if (!plan || plan.documentType !== "pdf") {
    return NextResponse.json({ error: "找不到這個方案，請重新整理後再試" }, { status: 400 });
  }

  if (input.action === "link") {
    // driveId：Drive 檔案編號；"none" 不要連動；null 交給自動比對。
    const driveId = input.driveId === null ? null : input.driveId === "none" || isDriveFileId(input.driveId) ? input.driveId : undefined;
    if (driveId === undefined) return NextResponse.json({ error: "資料格式不正確" }, { status: 400 });
    if (driveId && driveId !== "none" && !(await readDriveFiles())?.files.some((file) => file.id === driveId)) {
      return NextResponse.json({ error: "Drive 檔案清單裡找不到這個檔，請先按「立即同步」" }, { status: 400 });
    }
    try {
      await saveDrivePdfLink(drivePlanKey(tripId, planId), driveId);
    } catch (error) {
      console.error("Unable to save Drive PDF link", error);
      return NextResponse.json({ error: "儲存失敗，請稍後再試" }, { status: 503 });
    }
    if (!driveId || driveId === "none") return NextResponse.json({ ok: true });
    // 業務指定了檔案：馬上換成那個檔，不用等下次同步。
    try {
      await replacePlanWithDrive(tripId, planId);
      return NextResponse.json({ ok: true, replaced: true });
    } catch (error) {
      return NextResponse.json({ ok: true, replaced: false, warning: failure(error, "已記下指定的檔案，下次同步時換上") });
    }
  }

  if (input.action === "use-drive") {
    try {
      await replacePlanWithDrive(tripId, planId);
      return NextResponse.json({ ok: true, replaced: true });
    } catch (error) {
      console.error("Unable to replace PDF with the Drive version", error);
      return NextResponse.json({ error: failure(error, "換檔失敗，請稍後再試") }, { status: 502 });
    }
  }

  return NextResponse.json({ error: "不支援的操作" }, { status: 400 });
}
