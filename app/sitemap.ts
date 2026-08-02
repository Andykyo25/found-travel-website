import type { MetadataRoute } from "next";
import { getSiteContentWithMeta } from "@/lib/site-content";
import { getSiteOrigin } from "@/lib/site-url";
import {
  departureMonthOptions,
  departureRows,
  upcomingDepartureRows,
} from "@/lib/trip-filters";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await getSiteOrigin();
  const { content, meta } = await getSiteContentWithMeta();
  const lastModified = meta.updatedAt ? new Date(meta.updatedAt) : new Date();

  // 只列出還有未來團期的月份，避免把空頁面送進索引。
  const months = departureMonthOptions(
    upcomingDepartureRows(departureRows(content.trips)),
  );

  return [
    {
      url: `${origin}/`,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${origin}/dates`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...content.trips.map((trip) => ({
      url: `${origin}/dates/${trip.id}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...months.map((month) => ({
      url: `${origin}/dates/month/${month.id}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    {
      url: `${origin}/contact`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
