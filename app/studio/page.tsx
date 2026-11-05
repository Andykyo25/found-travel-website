import { requireStudioUser } from "@/lib/studio-auth";
import { getSiteContentWithMeta } from "@/lib/site-content";
import { taipeiTodayTime } from "@/lib/trip-filters";
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
  const [{ content, meta }, { trip }] = await Promise.all([getSiteContentWithMeta(), searchParams]);

  return (
    <main className="studio-shell">
      <StudioHeader email={user.email} active="trips" />
      <TripsEditor
        initialContent={content}
        initialUpdatedAt={meta.updatedAt}
        todayTime={taipeiTodayTime()}
        initialTripId={typeof trip === "string" ? trip : null}
      />
    </main>
  );
}
