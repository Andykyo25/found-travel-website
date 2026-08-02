import { SiteSettingsEditor } from "@/app/components/SiteSettingsEditor";
import { StudioHeader } from "@/app/components/StudioHeader";
import { getSiteContentWithMeta } from "@/lib/site-content";
import { requireStudioUser } from "@/lib/studio-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "網站設定",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function StudioSettingsPage() {
  const user = await requireStudioUser();
  const { content, meta } = await getSiteContentWithMeta();

  return (
    <main className="studio-shell">
      <StudioHeader email={user.email} active="settings" />
      <SiteSettingsEditor
        initialContent={content}
        initialUpdatedAt={meta.updatedAt}
      />
    </main>
  );
}
