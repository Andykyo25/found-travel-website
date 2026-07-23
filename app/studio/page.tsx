import { chatGPTSignOutPath, requireChatGPTUser } from "../chatgpt-auth";
import { claimOrCheckEditor, getSiteContent } from "@/lib/site-content";
import { StudioEditor } from "../components/StudioEditor";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "內容管理",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function StudioPage() {
  const user = await requireChatGPTUser("/studio");
  const canEdit = await claimOrCheckEditor(user.email);

  if (!canEdit) {
    return (
      <main className="studio-shell">
        <section className="access-denied">
          <p className="eyebrow">
            <span />
            PRIVATE STUDIO
          </p>
          <h1>這個帳號沒有編輯權限</h1>
          <p>
            目前只有第一位啟用內容管理的網站擁有者可以編輯。請向網站管理者申請權限。
          </p>
          <a className="button" href="/">
            回到網站
          </a>
        </section>
      </main>
    );
  }

  const content = await getSiteContent();

  return (
    <main className="studio-shell">
      <header className="studio-header">
        <div>
          <p>以 {user.displayName} 登入</p>
          <h1>旅行內容管理</h1>
        </div>
        <nav aria-label="內容管理導覽">
          <a className="button button-secondary button-small" href="/">
            查看網站
          </a>
          <a
            className="button button-secondary button-small"
            href={chatGPTSignOutPath("/")}
          >
            登出
          </a>
        </nav>
      </header>
      <StudioEditor initialContent={content} />
    </main>
  );
}
