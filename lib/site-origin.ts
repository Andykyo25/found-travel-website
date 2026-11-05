export function configuredSiteOrigin(value: string | undefined) {
  if (!value?.trim()) return null;
  const url = new URL(value.trim());
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "SITE_URL must be an HTTPS origin, for example https://www.example.com",
    );
  }
  return url.origin;
}

/**
 * www 與不帶 www 互為別名：SITE_URL 選哪一個，另一個就整站 301 過去，
 * 避免同一頁在兩個網址各被收錄一次。
 */
export function alternateSiteHost(origin: string) {
  const { hostname } = new URL(origin);
  return hostname.startsWith("www.") ? hostname.slice(4) : `www.${hostname}`;
}

/** next.config 的 has.host 是正規表示式（Next 會自動加上 ^ 與 $），點要跳脫。 */
export function exactHostPattern(hostname: string) {
  return hostname.replaceAll(".", "\\.");
}
