import type { NextConfig } from "next";
import {
  alternateSiteHost,
  configuredSiteOrigin,
  exactHostPattern,
} from "./lib/site-origin.ts";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  async redirects() {
    // 沒有正式網域（SITE_URL）之前不轉址；設定後下面兩種規則自動生效。
    const origin = configuredSiteOrigin(process.env.SITE_URL);
    if (!origin) return [];
    const railwayHost = process.env.RAILWAY_PUBLIC_DOMAIN;

    // Railway 臨時網域的公開頁面轉到正式網域（/studio、/api 保留給後台與健康檢查）。
    const railwayRedirects =
      railwayHost && new URL(origin).hostname !== railwayHost
        ? ["/", "/dates/:path*", "/news/:path*", "/find-trip", "/contact", "/about"].map((source) => ({
            source,
            has: [{ type: "host" as const, value: exactHostPattern(railwayHost) }],
            destination: `${origin}${source}`,
            permanent: true,
          }))
        : [];

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
