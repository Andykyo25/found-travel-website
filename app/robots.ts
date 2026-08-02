import type { MetadataRoute } from "next";
import { getSiteOrigin, isTemporaryHost } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await getSiteOrigin();

  // 臨時網域（*.up.railway.app、本機）整站不開放索引，
  // 正式網域接上後這裡會自動改回允許，不需要改程式。
  if (isTemporaryHost(origin)) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/studio", "/api/"],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
