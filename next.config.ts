import type { NextConfig } from "next";
import { configuredSiteOrigin } from "./lib/site-origin.ts";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
  async redirects() {
    const origin = configuredSiteOrigin(process.env.SITE_URL);
    const railwayHost = process.env.RAILWAY_PUBLIC_DOMAIN;
    if (!origin || !railwayHost || new URL(origin).hostname === railwayHost)
      return [];
    return ["/", "/dates/:path*", "/contact"].map((source) => ({
      source,
      has: [
        { type: "host" as const, value: railwayHost.replaceAll(".", "\\.") },
      ],
      destination: `${origin}${source}`,
      permanent: true,
    }));
  },
};

export default nextConfig;
