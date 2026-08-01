import Link from "next/link";

const tabs = [
  { id: "content", href: "/studio", label: "行程內容", title: "行程內容管理" },
  { id: "contacts", href: "/studio/contacts", label: "聯絡諮詢", title: "聯絡諮詢" },
] as const;

export type StudioTabId = (typeof tabs)[number]["id"];

export function StudioHeader({
  email,
  active,
}: {
  email: string;
  active: StudioTabId;
}) {
  const activeTab = tabs.find((tab) => tab.id === active) ?? tabs[0];

  return (
    <>
      <header className="studio-header">
        <div>
          <p>以 {email} 登入</p>
          <h1>找到了旅行社・{activeTab.title}</h1>
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

      <nav className="studio-tabs" aria-label="後台分頁">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            className={`studio-tab${tab.id === active ? " active" : ""}`}
            href={tab.href}
            aria-current={tab.id === active ? "page" : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
