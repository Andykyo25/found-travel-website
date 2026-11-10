// 公開頁面交給 Cloudflare 邊緣節點暫存（next.config 的 headers() 使用）。
//
// 伺服器在美國西岸，台灣訪客每開一頁都要跨太平洋來回一趟。頁面內容對每個人都一樣
// （前台不讀 cookie），讓離訪客最近的 Cloudflare 節點留一份，就不必每次回源。
//
// 用 Cloudflare-CDN-Cache-Control 而不是 Cache-Control：
// - Next 對動態頁面固定送 Cache-Control: no-store，設定檔改不掉；這個標頭它不會動。
// - 只有 Cloudflare 看得到（不會往下傳），瀏覽器仍然每次向 Cloudflare 要，不會自己留舊頁面。
//
// 這個標頭只決定「留多久」。Cloudflare 預設不暫存 HTML，要在後台加一條 Cache Rule
// 把這些路徑設成 Eligible for cache 才會生效（步驟見 README）；沒加規則時這個標頭沒有任何作用。

/** 暫存秒數。業務在後台存檔後，前台最慢約兩倍這個時間看到新內容（過期後還會先給一次舊的再更新）。 */
export const edgeCacheSeconds = 60;

// 聯絡表單（/contact）、後台（/studio）與 API 不在內。
export const edgeCachedPaths = [
  "/",
  "/trips/:path*",
  "/dates/:path*",
  "/news/:path*",
  "/find-trip",
  "/about",
];

export function edgeCacheHeaders() {
  const value = `public, max-age=${edgeCacheSeconds}, stale-while-revalidate=${edgeCacheSeconds}`;
  return edgeCachedPaths.map((source) => ({
    source,
    // 站內換頁時 Next 會用同一個路徑另外要一份 RSC 資料（帶 rsc 標頭）；只暫存完整的 HTML 頁面。
    missing: [{ type: "header" as const, key: "rsc" }],
    headers: [{ key: "Cloudflare-CDN-Cache-Control", value }],
  }));
}
