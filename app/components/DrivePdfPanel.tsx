"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { DrivePlanStatus } from "@/lib/drive-pdf";

export type DrivePdfRow = {
  key: string;
  tripId: string;
  planId: string;
  tripTitle: string;
  planLabel: string;
  status: DrivePlanStatus;
  /** 業務指定的 Drive 檔案編號或 "none"；空字串代表自動比對。 */
  manual: string;
  driveName: string;
  drivePath: string;
  driveModified: string;
  replacedAt: string;
  sourceName: string;
  candidates: { id: string; name: string; path: string }[];
};

type DriveFileOption = { id: string; name: string; path: string; modified: string };

type Filter = "attention" | "replaced" | "current" | "other" | "all";
const filterLabels: Record<Filter, string> = { attention: "需要處理", replaced: "已換新版", current: "與 Drive 一致", other: "其他", all: "全部" };

const attention = new Set<DrivePlanStatus>(["unmatched", "ambiguous", "missing", "site-newer", "failed", "draft"]);

function rowFilter(row: DrivePdfRow): Exclude<Filter, "all"> {
  if (attention.has(row.status)) return "attention";
  if (row.status === "replaced") return "replaced";
  if (row.status === "current") return "current";
  return "other";
}

const statusText: Record<DrivePlanStatus, string> = {
  replaced: "已換成 Drive 上的新版",
  current: "與 Drive 一致",
  unchecked: "還沒比對，下次同步時處理",
  "changed-on-site": "後台換過這個方案的 PDF，下次同步重新比對",
  off: "不連動：維持後台上傳的 PDF",
  unmatched: "Drive 上找不到同名的檔",
  ambiguous: "Drive 上有不只一個同名檔，請指定是哪一個",
  missing: "原本對到的檔在 Drive 上不見了，官網維持現有 PDF",
  draft: "Drive 上這個檔放在「待修」資料夾，先不換",
  "site-newer": "官網的 PDF 比 Drive 的新、內容也不一樣，沒有自動換",
  failed: "從 Drive 下載失敗，下次同步再試",
};

// 自己排台北時間（固定 UTC+8）：伺服器與瀏覽器的 toLocaleString 會用不同的空白字元，畫面會對不上。
function when(iso: string) {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return "";
  const taipei = new Date(time + 8 * 60 * 60_000);
  const two = (value: number) => String(value).padStart(2, "0");
  return `${taipei.getUTCFullYear()}/${two(taipei.getUTCMonth() + 1)}/${two(taipei.getUTCDate())} ${two(taipei.getUTCHours())}:${two(taipei.getUTCMinutes())}`;
}

const searchText = (text: string) => text.normalize("NFKC").toLowerCase();
const shortPath = (path: string) => path.split(" > ").slice(1).join(" › ") || path;

export function DrivePdfPanel({
  configured,
  running,
  syncedAt,
  error,
  rows,
  files,
}: {
  configured: boolean;
  running: boolean;
  syncedAt: string | null;
  error: { text: string; at: string } | null;
  rows: DrivePdfRow[];
  files: DriveFileOption[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("attention");
  const [busy, setBusy] = useState("");
  const [picking, setPicking] = useState("");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const counts = useMemo(() => {
    const result: Record<Filter, number> = { attention: 0, replaced: 0, current: 0, other: 0, all: rows.length };
    for (const row of rows) result[rowFilter(row)] += 1;
    return result;
  }, [rows]);
  const visible = rows.filter((row) => filter === "all" || rowFilter(row) === filter);
  const searchable = useMemo(() => files.map((file) => ({ file, text: searchText(`${file.name} ${file.path}`) })), [files]);
  const terms = searchText(query).split(/\s+/).filter(Boolean);
  const matches = terms.length === 0 ? [] : searchable.filter((item) => terms.every((term) => item.text.includes(term))).slice(0, 8);

  async function send(body: Record<string, unknown>, busyKey: string, done: string) {
    setBusy(busyKey);
    setMessage(null);
    try {
      const response = await fetch("/api/studio/drive-pdf", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as { error?: string; warning?: string; running?: boolean };
      if (!response.ok) throw new Error(result.error ?? "操作失敗");
      setMessage({ kind: result.warning ? "error" : "success", text: result.warning ?? (result.running ? "同步已經在進行中，請稍後重新整理這頁。" : done) });
      setPicking("");
      setQuery("");
      router.refresh();
    } catch (failure) {
      setMessage({ kind: "error", text: failure instanceof Error ? failure.message : "操作失敗" });
    } finally {
      setBusy("");
    }
  }

  const link = (row: DrivePdfRow, driveId: string | null, done: string) =>
    send({ action: "link", tripId: row.tripId, planId: row.planId, driveId }, row.key, done);

  return (
    <div className="tour-feed">
      <div className="tour-feed-status">
        <p>{syncedAt ? `上次同步：${when(syncedAt)}` : "還沒有同步過。"}</p>
        <button
          type="button"
          className="button button-secondary button-small"
          disabled={!configured || running || busy !== ""}
          onClick={() => send({ action: "sync" }, "sync", "已開始同步。第一次要比對所有 PDF，大約需要幾分鐘，完成後重新整理這頁就會看到結果。")}
        >
          {running ? "同步進行中…" : busy === "sync" ? "開始中…" : "立即同步"}
        </button>
      </div>
      {!configured ? (
        <p className="studio-warning">尚未設定業務系統的連線資訊（TOUR_FEED_ 開頭的四個變數），目前不會自動同步。請聯絡網站管理者。</p>
      ) : null}
      {error ? (
        <p className="studio-warning" role="alert">
          {when(error.at)} 同步失敗：{error.text}。官網維持上一次的結果；請稍後按「立即同步」，若仍失敗請聯絡網站管理者。
        </p>
      ) : null}
      {message ? (
        <p className={message.kind === "error" ? "studio-warning" : "tour-feed-done"} role="status">{message.text}</p>
      ) : null}

      <div className="tour-feed-filters" role="group" aria-label="篩選方案">
        {(Object.keys(filterLabels) as Filter[]).map((id) => (
          <button key={id} type="button" className="tour-feed-filter" aria-pressed={filter === id} onClick={() => setFilter(id)}>
            {filterLabels[id]}（{counts[id]}）
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="contact-table-empty">{syncedAt ? "這一類目前沒有方案。" : "同步一次之後，這裡會列出每個方案的 PDF 對到 Drive 上哪個檔。"}</div>
      ) : (
        <div className="contact-table-wrap">
          <table className="contact-table tour-feed-table drive-pdf-table">
            <thead>
              <tr>
                <th>官網行程・方案</th>
                <th>Drive 上的檔案</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const disabled = busy !== "" || running;
                return (
                  <tr key={row.key}>
                    <td>
                      <strong>{row.tripTitle}</strong>
                      {row.planLabel ? <small>{row.planLabel}</small> : null}
                    </td>
                    <td>
                      <p className={attention.has(row.status) ? "drive-pdf-status attention" : "drive-pdf-status"}>{statusText[row.status]}</p>
                      {row.driveName ? (
                        <small>
                          {row.driveName}
                          <br />
                          {shortPath(row.drivePath)}
                          {row.driveModified ? `｜Drive 更新於 ${when(row.driveModified)}` : ""}
                          {row.status === "replaced" && row.replacedAt ? `｜官網換上於 ${when(row.replacedAt)}` : ""}
                        </small>
                      ) : row.sourceName ? (
                        <small>官網的檔名：{row.sourceName}</small>
                      ) : null}

                      {row.status === "ambiguous" && row.candidates.length > 0 ? (
                        <div className="drive-pdf-choices" role="group" aria-label={`${row.tripTitle} 可能的檔案`}>
                          {row.candidates.map((candidate) => (
                            <button
                              key={candidate.id}
                              type="button"
                              className="button button-secondary button-small"
                              disabled={disabled}
                              onClick={() => link(row, candidate.id, `已指定「${row.tripTitle}」用 ${shortPath(candidate.path)} 的檔。`)}
                            >
                              用 {shortPath(candidate.path)} 的
                            </button>
                          ))}
                        </div>
                      ) : null}

                      <div className="drive-pdf-actions">
                        {row.status === "site-newer" ? (
                          <button
                            type="button"
                            className="button button-secondary button-small"
                            disabled={disabled}
                            onClick={() => send({ action: "use-drive", tripId: row.tripId, planId: row.planId }, row.key, `已把「${row.tripTitle}」換成 Drive 上的版本。`)}
                          >
                            改用 Drive 版本
                          </button>
                        ) : null}
                        {row.status !== "off" ? (
                          <button
                            type="button"
                            className="button button-secondary button-small"
                            disabled={disabled}
                            onClick={() => {
                              setPicking(picking === row.key ? "" : row.key);
                              setQuery("");
                            }}
                            aria-expanded={picking === row.key}
                          >
                            {row.driveName ? "換一個檔" : "指定 Drive 檔案"}
                          </button>
                        ) : null}
                        {row.manual && row.manual !== "none" ? (
                          <button type="button" className="button button-secondary button-small" disabled={disabled} onClick={() => link(row, null, `「${row.tripTitle}」改回自動比對，下次同步生效。`)}>
                            改回自動比對
                          </button>
                        ) : null}
                        {row.status === "off" ? (
                          <button type="button" className="button button-secondary button-small" disabled={disabled} onClick={() => link(row, null, `「${row.tripTitle}」恢復跟 Drive 連動，下次同步生效。`)}>
                            恢復連動
                          </button>
                        ) : (
                          <button type="button" className="button button-secondary button-small" disabled={disabled} onClick={() => link(row, "none", `「${row.tripTitle}」不再跟 Drive 連動，官網改回顯示後台上傳的 PDF。`)}>
                            不要連動
                          </button>
                        )}
                      </div>

                      {picking === row.key ? (
                        <div className="drive-pdf-picker">
                          <label>
                            搜尋 Drive 上的檔名或資料夾（可輸入多個關鍵字，用空白分開）
                            <input
                              type="search"
                              value={query}
                              autoFocus
                              placeholder="例如：釜山 五日"
                              onChange={(event) => setQuery(event.target.value)}
                            />
                          </label>
                          {files.length === 0 ? (
                            <small>還沒有 Drive 檔案清單，請先按「立即同步」。</small>
                          ) : terms.length > 0 && matches.length === 0 ? (
                            <small>找不到符合的檔案。</small>
                          ) : (
                            <ul>
                              {matches.map(({ file }) => (
                                <li key={file.id}>
                                  <button
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => link(row, file.id, `已指定「${row.tripTitle}」用「${file.name}」，並換上這個檔。`)}
                                  >
                                    <strong>{file.name}</strong>
                                    <small>
                                      {shortPath(file.path)}
                                      {file.modified ? `｜Drive 更新於 ${when(file.modified)}` : ""}
                                    </small>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ) : null}
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
