"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type TourFeedRow = {
  tripId: string;
  title: string;
  days: string;
  region: string;
  /** 目前實際套用的商品；空字串代表沒有套用。 */
  applied: string;
  /** 人工指定的值（商品 key 或 "none"）；空字串代表交給自動配對。 */
  manual: string;
  status: "auto" | "review" | "none";
  candidates: { key: string; reasons: string[] }[];
};

type Filter = "review" | "applied" | "none" | "all";
const filterLabels: Record<Filter, string> = { review: "待確認", applied: "已套用", none: "沒有對應", all: "全部" };

function rowFilter(row: TourFeedRow): Exclude<Filter, "all"> {
  if (row.applied) return "applied";
  return row.status === "review" && row.manual !== "none" ? "review" : "none";
}

const productLabel = (key: string) => key.split("｜").slice(1).join("・").replace(/・(\d+)$/, "・$1天");

export function TourFeedPanel({
  configured,
  syncedAt,
  stale,
  rows,
  products,
}: {
  configured: boolean;
  syncedAt: string | null;
  stale: boolean;
  rows: TourFeedRow[];
  products: { key: string; count: number }[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("review");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const counts = useMemo(() => {
    const result: Record<Filter, number> = { review: 0, applied: 0, none: 0, all: rows.length };
    for (const row of rows) result[rowFilter(row)] += 1;
    return result;
  }, [rows]);
  const productCount = useMemo(() => new Map(products.map((product) => [product.key, product.count])), [products]);
  const visible = rows.filter((row) => filter === "all" || rowFilter(row) === filter);

  async function send(body: Record<string, unknown>, busyKey: string, done: string) {
    setBusy(busyKey);
    setMessage(null);
    try {
      const response = await fetch("/api/studio/tour-feed", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "操作失敗");
      setMessage({ kind: "success", text: done });
      router.refresh();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "操作失敗" });
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="tour-feed">
      <div className="tour-feed-status">
        <p>
          {syncedAt
            ? `上次同步：${new Date(syncedAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false })}`
            : "還沒有同步過。"}
        </p>
        <button
          type="button"
          className="button button-secondary button-small"
          disabled={!configured || busy !== ""}
          onClick={() => send({ action: "sync" }, "sync", "已同步，下方是最新的配對結果。")}
        >
          {busy === "sync" ? "同步中…（約一分鐘）" : "立即同步"}
        </button>
      </div>
      {!configured ? (
        <p className="studio-warning">尚未設定業務系統的連線資訊（TOUR_FEED_ 開頭的四個變數），目前不會自動同步。請聯絡網站管理者。</p>
      ) : null}
      {stale ? (
        <p className="studio-warning" role="alert">
          已經超過三天沒有同步成功，官網暫時改回顯示各行程手動填寫的團期。請按「立即同步」；若仍失敗，請聯絡網站管理者。
        </p>
      ) : null}
      {message ? (
        <p className={message.kind === "error" ? "studio-warning" : "tour-feed-done"} role="status">{message.text}</p>
      ) : null}

      <div className="tour-feed-filters" role="group" aria-label="篩選行程">
        {(Object.keys(filterLabels) as Filter[]).map((id) => (
          <button key={id} type="button" className="tour-feed-filter" aria-pressed={filter === id} onClick={() => setFilter(id)}>
            {filterLabels[id]}（{counts[id]}）
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="contact-table-empty">{syncedAt ? "這一類目前沒有行程。" : "同步一次之後，這裡會列出每個行程對到的團期來源。"}</div>
      ) : (
        <div className="contact-table-wrap">
          <table className="contact-table tour-feed-table">
            <thead>
              <tr>
                <th>官網行程</th>
                <th>團期來源（動態檔的地區・行程・天數）</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const keys = [...new Set([row.applied, row.manual, ...row.candidates.map((candidate) => candidate.key)])].filter(
                  (key) => key && key !== "none" && productCount.has(key),
                );
                const reasons = row.candidates.find((candidate) => candidate.key === (row.applied || row.candidates[0]?.key))?.reasons ?? [];
                return (
                  <tr key={row.tripId}>
                    <td>
                      <strong>{row.title}</strong>
                      <small>{row.region}・{row.days}</small>
                    </td>
                    <td>
                      <select
                        aria-label={`${row.title} 的團期來源`}
                        value={row.manual || ""}
                        disabled={busy !== ""}
                        onChange={(event) =>
                          send(
                            { action: "link", tripId: row.tripId, key: event.target.value === "" ? null : event.target.value },
                            row.tripId,
                            `已更新「${row.title}」的團期來源。`,
                          )
                        }
                      >
                        <option value="">
                          {row.status === "auto" && row.candidates[0]
                            ? `自動：${productLabel(row.candidates[0].key)}`
                            : row.status === "review"
                              ? "待確認（目前不套用）"
                              : "自動（目前沒有對應）"}
                        </option>
                        {keys.map((key) => (
                          <option key={key} value={key}>
                            {productLabel(key)}（{productCount.get(key)} 團）
                          </option>
                        ))}
                        <option value="none">不要套用同步團期</option>
                      </select>
                      {reasons.length > 0 ? <small>依據：{reasons.join("、")}</small> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
