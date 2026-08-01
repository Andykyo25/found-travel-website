import { requireStudioUser } from "@/lib/studio-auth";
import { getSiteContentWithMeta } from "@/lib/site-content";
import { StudioEditor } from "../components/StudioEditor";
import { StudioHeader } from "../components/StudioHeader";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "行程內容管理",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function StudioPage() {
  const user = await requireStudioUser();
  const { content, meta } = await getSiteContentWithMeta();

  return (
    <main className="studio-shell">
      <StudioHeader email={user.email} active="content" />
      <StudioEditor
        initialContent={content}
        initialUpdatedAt={meta.updatedAt}
      />
    </main>
  );
}
