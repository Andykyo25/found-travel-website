import { NextRequest, NextResponse } from "next/server";
import { getStudioUserFromRequest } from "@/lib/studio-auth";
import {
  isRailwayStorageConfigured,
  listContentHistoryKeys,
  readContentHistoryObject,
} from "@/lib/railway-storage";
import { normalizeSiteContent } from "@/lib/site-content";
import { isContentHistoryKey } from "@/lib/storage-keys";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const listLimit = 20;

type Snapshot = { _updatedAt?: unknown; _updatedBy?: unknown; trips?: unknown } | null;

const text = (value: unknown) => (typeof value === "string" ? value : null);

// 回傳過去儲存前的內容，讓業務在誤改時能挑一個版本還原。只讀取，不會改動任何資料；
// 真正的還原是把內容載回編輯畫面，再由使用者按「儲存」。
export async function GET(request: NextRequest) {
  if (!getStudioUserFromRequest(request)) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }
  if (!isRailwayStorageConfigured()) {
    return NextResponse.json({ entries: [], available: false });
  }

  const key = request.nextUrl.searchParams.get("key");
  try {
    if (key !== null) {
      if (!isContentHistoryKey(key)) {
        return NextResponse.json({ error: "找不到這個版本" }, { status: 400 });
      }
      const snapshot = (await readContentHistoryObject(key)) as Snapshot;
      if (!snapshot || typeof snapshot !== "object" || !Array.isArray(snapshot.trips)) {
        return NextResponse.json({ error: "找不到這個版本" }, { status: 404 });
      }
      return NextResponse.json({
        content: normalizeSiteContent(snapshot),
        savedAt: text(snapshot._updatedAt),
        savedBy: text(snapshot._updatedBy),
      });
    }

    const keys = (await listContentHistoryKeys(listLimit)) ?? [];
    const entries = (
      await Promise.all(
        keys.map(async (entryKey) => {
          try {
            const snapshot = (await readContentHistoryObject(entryKey)) as Snapshot;
            if (!snapshot || typeof snapshot !== "object" || !Array.isArray(snapshot.trips)) return null;
            const content = normalizeSiteContent(snapshot);
            return {
              key: entryKey,
              // 這個版本當初是什麼時候、由誰儲存的；最早的初始內容沒有紀錄。
              savedAt: text(snapshot._updatedAt),
              savedBy: text(snapshot._updatedBy),
              // 被下一次儲存取代的時間（檔名前綴），沒有儲存時間時拿來排序與顯示。
              replacedAt: new Date(Number(entryKey.split("/")[1].slice(0, 13))).toISOString(),
              tripCount: content.trips.length,
              tripTitles: content.trips.slice(0, 6).map((trip) => trip.title),
            };
          } catch {
            return null;
          }
        }),
      )
    ).filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    return NextResponse.json({ entries, available: true });
  } catch (error) {
    console.error("Unable to read content history", error);
    return NextResponse.json({ error: "暫時讀不到歷史版本，請稍後再試" }, { status: 503 });
  }
}
