import { StudioHeader } from "@/app/components/StudioHeader";
import { TripImport } from "@/app/components/TripImport";
import { getSiteContentWithMeta } from "@/lib/site-content";
import { requireStudioUser } from "@/lib/studio-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "批次匯入行程",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function StudioImportPage() {
  const user = await requireStudioUser();
  const { content } = await getSiteContentWithMeta();

  return (
    <main className="studio-shell">
      <StudioHeader email={user.email} active="import" />
      <section className="studio-panel">
        <div className="studio-section">
          <div className="studio-section-heading">
            <div>
              <h2>批次匯入行程</h2>
              <p>
                選擇放行程 PDF 的資料夾（資料夾裡要有「匯入清單.json」），系統會自動上傳每一份 PDF、建立行程與航空版本，
                不用一個一個新增。已經在網站上的行程不會重複加入，中途斷線重新匯入也沒關係。
              </p>
            </div>
          </div>
          <TripImport existingTripIds={content.trips.map((trip) => trip.id)} />
        </div>
      </section>
    </main>
  );
}
