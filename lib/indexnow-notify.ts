import "server-only";

import { after } from "next/server";
import type { Trip } from "@/lib/site-content";
import { changedPaths, submitToIndexNow } from "@/lib/indexnow";
import { getSiteOrigin, isTemporaryHost } from "@/lib/site-url";

/**
 * 後台存檔成功後呼叫：回應先送出，再在背景通知搜尋引擎。
 * 臨時網域（*.up.railway.app、本機）不通知，那些網址本來就不給索引。
 */
export async function notifyChangedTrips(previous: readonly Trip[], next: readonly Trip[]) {
  // 內容已經存好了，這裡出任何錯都不能讓存檔變成失敗。
  try {
    const paths = changedPaths(previous, next);
    if (paths.length === 0) return;
    const origin = await getSiteOrigin();
    if (isTemporaryHost(origin)) return;
    after(() => submitToIndexNow(origin, paths));
  } catch (error) {
    console.error("Unable to queue IndexNow notification", error);
  }
}
