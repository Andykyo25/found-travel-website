import type { MetadataRoute } from "next";
import { publishedNews } from "@/lib/news";
import { getSiteContentWithMeta } from "@/lib/site-content";
import { getSiteOrigin } from "@/lib/site-url";
import { tripPath } from "@/lib/trip-values";
import { tripDestinations } from "@/lib/destinations";
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

  // 行程頁用各自的修改時間；還沒被改過的舊行程沒有紀錄，就不寫（寫錯比不寫糟）。
  const modified = (updatedAt?: string) => (updatedAt ? { lastModified: new Date(updatedAt) } : {});
  const destinations = tripDestinations(content.trips);
  const latest = (times: (string | undefined)[]) => times.filter((time): time is string => Boolean(time)).sort().at(-1);

  return [
    { url: `${origin}/about`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${origin}/find-trip`, lastModified, changeFrequency: "weekly", priority: 0.9 },
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
    ...(destinations.length ? [{ url: `${origin}/destinations`, lastModified, changeFrequency: "weekly" as const, priority: 0.8 }] : []),
    ...destinations.map((destination) => ({
      url: `${origin}${destination.path}`,
      ...modified(latest(destination.trips.map((trip) => trip.updatedAt))),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    ...content.trips.map((trip) => ({
      url: `${origin}${tripPath(trip)}`,
      ...modified(trip.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...months.map((month) => ({
      url: `${origin}/dates/month/${month.id}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    { url: `${origin}/news`, changeFrequency: "weekly", priority: 0.7 },
    ...publishedNews().map((article) => ({
      url: `${origin}/news/${article.slug}`,
      lastModified: new Date(article.updatedAt ?? article.publishedAt),
      changeFrequency: "monthly" as const,
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
