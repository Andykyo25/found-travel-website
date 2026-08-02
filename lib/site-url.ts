import "server-only";

import { headers } from "next/headers";

// 網站還沒有正式網域，因此一律從請求標頭推導 origin，
// 買了 domain 接上 Railway 之後不需要改任何程式。
export async function getSiteOrigin() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    requestHeaders.get("host") ??
    "found-travel.local";
  const protocol =
    requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";

  return `${protocol}://${host}`;
}

// Railway 配發的臨時網域。讓它被索引會有兩個問題：
// 搜尋結果顯示 *.up.railway.app 不像正式官網，之後換網域還會變成重複內容。
export function isTemporaryHost(origin: string) {
  try {
    const { hostname } = new URL(origin);
    return (
      hostname.endsWith(".up.railway.app") ||
      hostname === "localhost" ||
      hostname.endsWith(".local")
    );
  } catch {
    return true;
  }
}
