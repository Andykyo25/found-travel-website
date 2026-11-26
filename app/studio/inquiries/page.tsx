import { StudioHeader } from "@/app/components/StudioHeader";
import { tripDestinations } from "@/lib/destinations";
import { inquirySinceDate, summarizeInquiryEvents } from "@/lib/inquiry-events";
import { findNewsArticle } from "@/lib/news";
import { listInquiryEventKeys } from "@/lib/railway-storage";
import { getSiteContent } from "@/lib/site-content";
import { requireStudioUser } from "@/lib/studio-auth";
import { findTripByPathKey } from "@/lib/trip-values";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "詢問來源",
  robots: { index: false, follow: false },
};

const ranges = [7, 30, 90] as const;

const fixedPages: Record<string, string> = {
  "/": "首頁",
  "/dates": "出發團期總表",
  "/destinations": "旅遊目的地",
  "/find-trip": "幫我找旅行",
  "/news": "最新消息",
  "/about": "關於我們",
  "/vip": "VIP 集點",
  "/contact": "聯絡表單（直接進入）",
};

export default async function StudioInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const user = await requireStudioUser();
  const requested = Number((await searchParams).days);
  const days = ranges.find((range) => range === requested) ?? 30;
  const since = inquirySinceDate(days);

  const [content, keys] = await Promise.all([
    getSiteContent(),
    listInquiryEventKeys(since).catch((error) => {
      console.error("Unable to list inquiry events", error);
      return undefined;
    }),
  ]);
  const { totals, rows } = summarizeInquiryEvents(keys ?? []);
  const destinations = tripDestinations(content.trips);

  const label = (path: string) => {
    if (fixedPages[path]) return fixedPages[path];
    const [, section, key = ""] = path.split("/");
    const slug = decodeURIComponent(key);
    if (section === "trips") return findTripByPathKey(content.trips, slug)?.title ?? `已下架行程（${slug}）`;
    if (section === "news") return findNewsArticle(slug, undefined, "9999-12-31")?.shortTitle ?? path;
    if (section === "destinations") return destinations.find((item) => item.path === path)?.name ?? path;
    if (section === "dates") return `${slug.replace("-", " 年 ")} 月團期`;
    return path;
  };

  return (
    <main className="studio-shell">
      <StudioHeader email={user.email} active="inquiries" />

      <section className="studio-panel">
        <div className="studio-section">
          <div className="studio-section-heading">
            <div>
              <h2>客人從哪一頁來詢問</h2>
              <p>
                「LINE 點擊」是客人在那一頁按了 LINE 聯絡按鈕的次數（同一人按兩次算兩次，按了不一定有傳訊息）；
                「表單送出」是成功送出的聯絡表單，從行程頁點過去的會算在那個行程頁。不記錄任何個人資料。
              </p>
            </div>
          </div>

          <nav className="tour-feed-filters" aria-label="統計期間">
            {ranges.map((range) => (
              <a key={range} className="tour-feed-filter" href={`/studio/inquiries?days=${range}`} aria-current={range === days ? "page" : undefined}>
                最近 {range} 天
              </a>
            ))}
          </nav>

          {keys === null ? (
            <p className="studio-warning">資料儲存空間尚未設定完成，目前無法統計。</p>
          ) : keys === undefined ? (
            <p className="studio-warning" role="alert">目前讀取不到統計資料，請稍後重新整理。</p>
          ) : (
            <>
              <p className="inquiry-totals">
                最近 {days} 天：LINE 點擊 <strong>{totals.line}</strong> 次・表單送出 <strong>{totals.form}</strong> 筆
              </p>
              {rows.length === 0 ? (
                <div className="contact-table-empty">這段期間還沒有紀錄。功能上線後才開始累積。</div>
              ) : (
                <div className="contact-table-wrap">
                  <table className="contact-table inquiry-table">
                    <thead>
                      <tr>
                        <th scope="col">頁面</th>
                        <th scope="col">LINE 點擊</th>
                        <th scope="col">表單送出</th>
                        <th scope="col">合計</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.path}>
                          <th scope="row">
                            <a href={row.path} target="_blank" rel="noopener">{label(row.path)}</a>
                            <small>{row.path}</small>
                          </th>
                          <td>{row.line}</td>
                          <td>{row.form}</td>
                          <td><strong>{row.line + row.form}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
