import type { NextConfig } from "next";
import {
  alternateSiteHost,
  configuredSiteOrigin,
  exactHostPattern,
  railwayHostPattern,
} from "./lib/site-origin.ts";
import { edgeCacheHeaders } from "./lib/edge-cache.ts";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  images: {
    // 預設會替每張圖產生 8～10 種寬度（到 3840px），網址全部寫進頁面。
    // 行程照片來源最寬約 1740px，更大的尺寸只是放大，不會更清楚；留這幾種就夠。
    deviceSizes: [640, 828, 1200, 1920],
    imageSizes: [384],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
    ],
  },
  // 公開頁面給 Cloudflare 的暫存時間（說明見 lib/edge-cache.ts）。
  async headers() {
    return edgeCacheHeaders();
  },
  async redirects() {
    // 沒有正式網域（SITE_URL）之前不轉址；設定後下面兩種規則自動生效。
    const origin = configuredSiteOrigin(process.env.SITE_URL);
    if (!origin) return [];

    // Railway 臨時網域（*.up.railway.app）的公開頁面轉到正式網域（/studio、/api 保留給後台與健康檢查）。
    // SITE_URL 本身若還是臨時網域就不轉，避免自己轉給自己。
    const railwayRedirects = new RegExp(`^${railwayHostPattern}$`).test(new URL(origin).hostname)
      ? []
      : ["/", "/trips/:path*", "/destinations/:path*", "/dates/:path*", "/news/:path*", "/find-trip", "/contact", "/about"].map((source) => ({
          source,
          has: [{ type: "host" as const, value: railwayHostPattern }],
          destination: `${origin}${source}`,
          permanent: true,
        }));

    // www 與不帶 www 只留 SITE_URL 那一個。
    const aliasRedirect = {
      source: "/:path*",
      has: [{ type: "host" as const, value: exactHostPattern(alternateSiteHost(origin)) }],
      destination: `${origin}/:path*`,
      permanent: true,
    };

    return [...railwayRedirects, aliasRedirect];
  },
};

export default nextConfig;
