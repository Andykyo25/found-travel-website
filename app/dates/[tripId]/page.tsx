import { notFound, permanentRedirect } from "next/navigation";
import { getSiteContent } from "@/lib/site-content";
import { findTripByPathKey, tripPath } from "@/lib/trip-values";

export const dynamic = "force-dynamic";

// 行程頁已搬到 /trips/…。舊的 /dates/<行程 ID> 連結（LINE、社群上分享過的）永久轉過去；
// 網址最後的 #plan-… 由瀏覽器保留。
export default async function LegacyTripPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const trip = findTripByPathKey((await getSiteContent()).trips, tripId);
  if (!trip) notFound();
  permanentRedirect(tripPath(trip));
}
