import { StudioHeader } from "@/app/components/StudioHeader";
import { TourFeedPanel, type TourFeedRow } from "@/app/components/TourFeedPanel";
import { getSiteContentWithMeta } from "@/lib/site-content";
import { requireStudioUser } from "@/lib/studio-auth";
import { isFeedStale, resolveFeedLinks } from "@/lib/tour-feed-overlay";
import { getTourFeedState } from "@/lib/tour-feed-store";
import { isTourFeedConfigured } from "@/lib/tour-feed-sync";

export const dynamic = "force-dynamic";

export const metadata = { title: "團期同步", robots: { index: false, follow: false } };

export default async function StudioTourFeedPage() {
  const user = await requireStudioUser();
  const [{ content }, { snapshot, links }] = await Promise.all([getSiteContentWithMeta(), getTourFeedState()]);
  const resolved = snapshot ? resolveFeedLinks(snapshot, links) : new Map<string, string>();
  const matches = new Map(snapshot?.matches.map((match) => [match.tripId, match]) ?? []);
  const rows: TourFeedRow[] = content.trips.map((trip) => {
    const match = matches.get(trip.id);
    return {
      tripId: trip.id,
      title: trip.title,
      days: trip.days,
      region: trip.region,
      applied: resolved.get(trip.id) ?? "",
      manual: links[trip.id] ?? "",
      status: match?.status ?? "none",
      candidates: match?.candidates.map((candidate) => ({ key: candidate.key, reasons: candidate.reasons })) ?? [],
    };
  });
  const products = snapshot?.products.map((product) => ({ key: product.key, count: product.departures.length })) ?? [];
  const stale = snapshot ? isFeedStale(snapshot) : false;

  return (
    <main className="studio-shell">
      <StudioHeader email={user.email} active="tour-feed" />
      <section className="studio-panel">
        <div className="studio-section">
          <div className="studio-section-heading">
            <div>
              <h2>團期同步</h2>
              <p>
                官網會定時從業務系統的動態檔抓出發日、售價與額滿狀態，套到對應的行程上。
                這裡只顯示日期、售價、狀態；旅客姓名、利潤等內部資料不會被抓進來。
                對得上的行程自動套用；「待確認」的請幫忙選一次，之後就會記住。
              </p>
            </div>
          </div>
          <TourFeedPanel
            configured={isTourFeedConfigured()}
            syncedAt={snapshot?.syncedAt ?? null}
            stale={stale}
            rows={rows}
            products={products}
          />
        </div>
      </section>
    </main>
  );
}
