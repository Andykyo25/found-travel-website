import { requireStudioUser } from "@/lib/studio-auth";
import { getSiteContentWithMeta } from "@/lib/site-content";
import { taipeiTodayTime } from "@/lib/trip-filters";
import { removeExpiredFromContent } from "@/lib/departure-tools";
import { applyTourFeed } from "@/lib/tour-feed-overlay";
import { getTourFeedState } from "@/lib/tour-feed-store";
import { StudioHeader } from "../components/StudioHeader";
import { TripsEditor } from "../components/TripsEditor";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "行程管理",
  robots: {
    index: false,
    follow: false,
  },
};

// ?trip=<行程 ID>：直接打開該行程的編輯頁（重新整理、分享網址給同事都會回到同一個行程）。
export default async function StudioTripsPage({
  searchParams,
}: {
  searchParams: Promise<{ trip?: string | string[] }>;
}) {
  const user = await requireStudioUser();
  const [{ content: stored, meta }, { trip }, feed] = await Promise.all([getSiteContentWithMeta(), searchParams, getTourFeedState()]);
  const todayTime = taipeiTodayTime();
  // 已過期的團期打開後台時就先拿掉；下次按儲存時一併寫回。
  const content = removeExpiredFromContent(stored, todayTime).content;
  // 團期由「團期同步」帶進來的行程：前台有團期，後台不要把它們算成缺團期。
  const synced = applyTourFeed(content, feed.snapshot, feed.links, todayTime);
  const syncedDepartureCounts = Object.fromEntries(
    synced.trips
      .filter((item, index) => item.departures !== content.trips[index]?.departures && item.departures.length > 0)
      .map((item) => [item.id, item.departures.length]),
  );

  return (
    <main className="studio-shell">
      <StudioHeader email={user.email} active="trips" />
      <TripsEditor
        initialContent={content}
        initialUpdatedAt={meta.updatedAt}
        todayTime={todayTime}
        syncedDepartureCounts={syncedDepartureCounts}
        initialTripId={typeof trip === "string" ? trip : null}
      />
    </main>
  );
}
