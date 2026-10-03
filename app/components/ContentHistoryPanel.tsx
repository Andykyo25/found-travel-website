"use client";

import { useState } from "react";
import type { SiteContent } from "@/lib/site-content";
import { describeRestore, summarizeContentRestore } from "@/lib/content-diff";

type Entry = {
  key: string;
  savedAt: string | null;
  savedBy: string | null;
  replacedAt: string;
  tripCount: number;
  tripTitles: string[];
};

type Preview = {
  key: string;
  content: SiteContent;
  label: string;
  lines: string[];
  unchanged: boolean;
};

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;
}

const who = (email: string | null) => (email ? email.split("@")[0] : null);

function entryLabel(entry: Entry) {
  return entry.savedAt ? formatWhen(entry.savedAt) : `最初的內容（${formatWhen(entry.replacedAt)} 被取代）`;
}

// 誤改、誤刪時的後悔藥：每次儲存前，系統都會留下儲存前的內容。
// 選一個版本只是把它載回畫面，按「儲存並更新網站」才會生效；而那一次儲存本身也會
// 留下「還原前」的版本，所以還原也能再還原。
export function ContentHistoryPanel({
  current,
  dirty,
  onRestore,
}: {
  current: SiteContent;
  dirty: boolean;
  onRestore: (content: SiteContent, label: string) => void;
}) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewingKey, setPreviewingKey] = useState<string | null>(null);

  async function loadList() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/studio/history", { cache: "no-store" });
      const result = (await response.json()) as { entries?: Entry[]; available?: boolean; error?: string };
      if (!response.ok) throw new Error(result.error ?? "暫時讀不到歷史版本");
      setEntries(result.entries ?? []);
      setAvailable(result.available !== false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "暫時讀不到歷史版本");
    } finally {
      setLoading(false);
    }
  }

  async function showPreview(entry: Entry) {
    setPreviewingKey(entry.key);
    setError("");
    try {
      const response = await fetch(`/api/studio/history?key=${encodeURIComponent(entry.key)}`, { cache: "no-store" });
      const result = (await response.json()) as { content?: SiteContent; error?: string };
      if (!response.ok || !result.content) throw new Error(result.error ?? "讀不到這個版本");
      const summary = summarizeContentRestore(current, result.content);
      setPreview({
        key: entry.key,
        content: result.content,
        label: entryLabel(entry),
        lines: describeRestore(summary),
        unchanged: summary.unchanged,
      });
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : "讀不到這個版本");
    } finally {
      setPreviewingKey(null);
    }
  }

  return (
    <details
      className="history-panel"
      onToggle={(event) => {
        if (event.currentTarget.open && entries === null && !loading) void loadList();
      }}
    >
      <summary>還原先前的版本（不小心改錯或刪錯時使用）</summary>
      <p className="history-intro">
        每次按「儲存並更新網站」之前，系統都會留下儲存前的內容。選一個版本載回畫面，確認沒問題再按最下方的儲存，網站才會換回去；
        在儲存之前，重新整理頁面就能放棄。
      </p>

      {loading ? <p className="history-note">讀取中…</p> : null}
      {error ? <p className="batch-error" role="alert">{error}</p> : null}
      {!loading && entries !== null && !available ? (
        <p className="history-note">目前沒有啟用歷史版本的儲存空間，無法使用還原功能。</p>
      ) : null}
      {!loading && entries !== null && available && entries.length === 0 ? (
        <p className="history-note">還沒有可以還原的版本。第一次儲存之後就會開始保留。</p>
      ) : null}

      {entries && entries.length > 0 ? (
        <ul className="history-list">
          {entries.map((entry) => (
            <li key={entry.key} className={preview?.key === entry.key ? "is-selected" : undefined}>
              <div>
                <strong>{entryLabel(entry)}</strong>
                {who(entry.savedBy) ? <span>由 {who(entry.savedBy)} 儲存</span> : null}
                <small>
                  共 {entry.tripCount} 個行程
                  {entry.tripTitles.length ? `：${entry.tripTitles.join("、")}${entry.tripCount > entry.tripTitles.length ? "…" : ""}` : ""}
                </small>
              </div>
              <button
                type="button"
                className="button button-secondary button-small"
                disabled={previewingKey !== null}
                onClick={() => void showPreview(entry)}
              >
                {previewingKey === entry.key ? "讀取中…" : "查看差異"}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {entries && entries.length >= 20 ? (
        <p className="history-note">這裡只列出最近 20 個版本。</p>
      ) : null}

      {preview ? (
        <div className="history-preview" role="region" aria-label={`還原成 ${preview.label} 的版本`}>
          <h4>還原成「{preview.label}」的版本，會有這些變化：</h4>
          <ul>
            {preview.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {dirty ? (
            <p className="history-warn">注意：目前畫面上還沒儲存的修改，會被這個版本取代。</p>
          ) : null}
          <div className="history-actions">
            <button
              type="button"
              className="button button-small"
              disabled={preview.unchanged}
              onClick={() => {
                onRestore(preview.content, preview.label);
                setPreview(null);
              }}
            >
              把畫面換成這個版本
            </button>
            <button type="button" className="button button-secondary button-small" onClick={() => setPreview(null)}>
              取消
            </button>
          </div>
        </div>
      ) : null}
    </details>
  );
}
