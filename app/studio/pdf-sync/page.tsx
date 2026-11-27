import { StudioHeader } from "@/app/components/StudioHeader";
import { DrivePdfPanel, type DrivePdfRow } from "@/app/components/DrivePdfPanel";
import { getSiteContentWithMeta } from "@/lib/site-content";
import { requireStudioUser } from "@/lib/studio-auth";
import { drivePlanKey, drivePlanStatus, type DrivePdfLinks } from "@/lib/drive-pdf";
import { readDriveFiles, readDrivePdfStateFresh } from "@/lib/drive-pdf-store";
import { isDrivePdfSyncRunning } from "@/lib/drive-pdf-sync";
import { isTourFeedConfigured } from "@/lib/tour-feed-sync";
import { tripPdfKeyFromDocumentUrl } from "@/lib/storage-keys";

export const dynamic = "force-dynamic";

export const metadata = { title: "PDF 同步", robots: { index: false, follow: false } };

export default async function StudioPdfSyncPage() {
  const user = await requireStudioUser();
  const [{ content }, { state, links }, fileList] = await Promise.all([
    getSiteContentWithMeta(),
    readDrivePdfStateFresh().catch(() => ({ state: null, links: {} as DrivePdfLinks })),
    readDriveFiles().catch(() => null),
  ]);
  const files = fileList?.files ?? [];
  const fileById = new Map(files.map((file) => [file.id, file]));

  const rows: DrivePdfRow[] = content.trips.flatMap((trip) =>
    trip.plans.flatMap((plan): DrivePdfRow[] => {
      if (plan.documentType !== "pdf" || !tripPdfKeyFromDocumentUrl(plan.documentUrl)) return [];
      const key = drivePlanKey(trip.id, plan.id);
      const entry = state?.plans[key];
      const manual = links[key] ?? "";
      return [
        {
          key,
          tripId: trip.id,
          planId: plan.id,
          tripTitle: trip.title,
          planLabel: [plan.airline, plan.title].filter(Boolean).join("・"),
          status: drivePlanStatus(trip.id, plan, state, links),
          manual,
          driveName: entry?.driveName ?? "",
          drivePath: entry?.drivePath ?? "",
          driveModified: (entry?.driveId && fileById.get(entry.driveId)?.modified) || "",
          replacedAt: entry?.replacedAt ?? "",
          sourceName: entry?.sourceName ?? "",
          candidates: (entry?.candidates ?? []).flatMap((id) => {
            const file = fileById.get(id);
            return file ? [{ id, name: file.name, path: file.path }] : [];
          }),
        },
      ];
    }),
  );

  return (
    <main className="studio-shell">
      <StudioHeader email={user.email} active="pdf-sync" />
      <section className="studio-panel">
        <div className="studio-section">
          <div className="studio-section-heading">
            <div>
              <h2>PDF 同步</h2>
              <p>
                官網會定時去看業務系統 Google Drive 上的行程 PDF，Drive 上的檔比官網的新，就自動換上，每日行程也會一起更新。
                這裡只讀業務系統與 Drive，不會改動那邊任何東西；換下來的舊 PDF 會保留，後台行程管理裡看到的仍是原本上傳的檔。
              </p>
            </div>
          </div>
          <DrivePdfPanel
            configured={isTourFeedConfigured()}
            running={isDrivePdfSyncRunning()}
            syncedAt={state?.syncedAt || null}
            error={state?.error ? { text: state.error, at: state.errorAt ?? "" } : null}
            rows={rows}
            files={files.map(({ id, name, path, modified }) => ({ id, name, path, modified }))}
          />
        </div>
      </section>
    </main>
  );
}
