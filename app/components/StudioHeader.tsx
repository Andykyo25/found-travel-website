// 分頁切換與「查看網站」刻意使用一般連結（整頁載入）：
// 這樣有未儲存的變更時，瀏覽器的離開提醒才會生效；前台則另開分頁，不打斷編輯。

const tabs = [
  { id: "trips", href: "/studio", label: "行程管理", title: "行程管理" },
  {
    id: "contacts",
    href: "/studio/contacts",
    label: "聯絡諮詢",
    title: "聯絡諮詢",
  },
  {
    id: "settings",
    href: "/studio/settings",
    label: "網站設定",
    title: "網站設定",
  },
] as const;

export type StudioTabId = (typeof tabs)[number]["id"];

export function StudioHeader({
  email,
  active,
}: {
  email: string;
  // account：修改密碼頁，不在分頁列上。
  active: StudioTabId | "account";
}) {
  const activeTab =
    active === "account"
      ? { id: "account", title: "修改密碼" }
      : (tabs.find((tab) => tab.id === active) ?? tabs[0]);

  return (
    <>
      <header className="studio-header">
        <div>
          <p>以 {email} 登入</p>
          <h1>找到了旅行社・{activeTab.title}</h1>
        </div>
        <nav aria-label="內容管理導覽">
          <a
            className="button button-secondary button-small"
            href="/"
            target="_blank"
            rel="noopener"
          >
            查看網站 ↗
          </a>
          <a
            className="button button-secondary button-small"
            href="/studio/account"
            aria-current={active === "account" ? "page" : undefined}
          >
            修改密碼
          </a>
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
          <a
            key={tab.id}
            className={`studio-tab${tab.id === active ? " active" : ""}`}
            href={tab.href}
            aria-current={tab.id === active ? "page" : undefined}
          >
            {tab.label}
          </a>
        ))}
      </nav>
    </>
  );
}
