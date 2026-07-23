import Link from "next/link";
import { requireStudioUser } from "@/lib/studio-auth";
import { getSiteContent } from "@/lib/site-content";
import { StudioEditor } from "../components/StudioEditor";

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
  const content = await getSiteContent();

  return (
    <main className="studio-shell">
      <header className="studio-header">
        <div>
          <p>以 {user.email} 登入</p>
          <h1>找到了旅行社・行程內容管理</h1>
        </div>
        <nav aria-label="內容管理導覽">
          <Link className="button button-secondary button-small" href="/">
            查看網站
          </Link>
          <form method="post" action="/api/studio/logout">
            <button
              className="button button-secondary button-small"
              type="submit"
            >
              登出
            </button>
          </form>
        </nav>
      </header>
      <StudioEditor initialContent={content} />
    </main>
  );
}
