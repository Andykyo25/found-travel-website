import { NextRequest, NextResponse } from "next/server";
import { getStudioUserFromRequest, isSameOriginRequest } from "@/lib/studio-auth";
import { saveTourFeedLink, getTourFeedState } from "@/lib/tour-feed-store";
import { isTourFeedConfigured, syncTourFeed } from "@/lib/tour-feed-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 後台「團期同步」頁：立即同步，或指定某個行程要套用哪個商品。
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "無效的操作來源" }, { status: 403 });
  if (!getStudioUserFromRequest(request)) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  let input: { action?: unknown; tripId?: unknown; key?: unknown };
  try {
    input = (await request.json()) as typeof input;
  } catch {
    return NextResponse.json({ error: "資料格式不正確" }, { status: 400 });
  }

  if (input.action === "sync") {
    if (!isTourFeedConfigured()) return NextResponse.json({ error: "尚未設定業務系統的連線資訊" }, { status: 503 });
    try {
      const snapshot = await syncTourFeed();
      return NextResponse.json({ syncedAt: snapshot.syncedAt });
    } catch (error) {
      console.error("Tour feed sync failed", error);
      return NextResponse.json({ error: "同步失敗，官網維持上一次同步的團期。請稍後再試。" }, { status: 502 });
    }
  }

  if (input.action === "link") {
    const tripId = typeof input.tripId === "string" ? input.tripId.slice(0, 120) : "";
    // key：商品識別字串；"none" 不套用；null 回到自動配對。
    const key = input.key === null ? null : typeof input.key === "string" ? input.key.slice(0, 200) : undefined;
    if (!tripId || key === undefined) return NextResponse.json({ error: "資料格式不正確" }, { status: 400 });
    const { snapshot } = await getTourFeedState();
    if (key !== null && key !== "none" && !snapshot?.products.some((product) => product.key === key)) {
      return NextResponse.json({ error: "找不到這個團期來源，請重新整理後再選一次" }, { status: 400 });
    }
    try {
      await saveTourFeedLink(tripId, key);
      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error("Unable to save tour feed link", error);
      return NextResponse.json({ error: "儲存失敗，請稍後再試" }, { status: 503 });
    }
  }

  return NextResponse.json({ error: "不支援的操作" }, { status: 400 });
}
