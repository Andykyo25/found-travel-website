"use client";

import { useEffect, useMemo, useState } from "react";
import { validateTripDates } from "@/lib/trip-validation";
import type { SiteContent } from "@/lib/site-content";

export type Status =
  | { kind: "idle"; message: string }
  | { kind: "saving"; message: string }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export function Field({
  label,
  hint,
  children,
  wide = false,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`field${wide ? " field-wide" : ""}`}>
      <span>{label}</span>
      {hint ? <small>{hint}</small> : null}
      {children}
    </label>
  );
}

// 行程管理與網站設定兩個分頁各自編輯 SiteContent 的一部分，
// 但儲存時送出的都是完整內容，因此共用同一份草稿與儲存流程。
// 兩人同時改不同分頁時，後存的那邊會被 API 的 _baseUpdatedAt 擋下並提示重整。
export function useSiteContentDraft(
  initialContent: SiteContent,
  initialUpdatedAt: string | null,
) {
  const [draft, setDraft] = useState(initialContent);
  const [baseUpdatedAt, setBaseUpdatedAt] = useState(initialUpdatedAt);
  const [status, setStatus] = useState<Status>({
    kind: "idle",
    message: "尚未有變更",
  });
  // 以「目前草稿」對照「上次儲存的內容」判斷有沒有未儲存的變更，
  // 比逐一記錄每個動作可靠（新增、刪除、上傳 PDF 都會被算進去）。
  const [saved, setSaved] = useState(() => JSON.stringify(initialContent));
  const dirty = useMemo(() => JSON.stringify(draft) !== saved, [draft, saved]);

  // 有未儲存的變更時，關閉分頁、重新整理或離開本頁，瀏覽器會先詢問。
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const markChanged = () => {
    setStatus({ kind: "idle", message: "" });
  };

  const updateRoot = <K extends keyof SiteContent>(
    key: K,
    value: SiteContent[K],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
    markChanged();
  };

  const save = async () => {
    const invalid = validateTripDates(draft);
    if (invalid) {
      setStatus({ kind: "error", message: invalid });
      return;
    }
    setStatus({ kind: "saving", message: "儲存中…" });
    try {
      const response = await fetch("/api/studio/content", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...draft, _baseUpdatedAt: baseUpdatedAt }),
      });
      const result = (await response.json()) as {
        content?: SiteContent;
        savedAt?: string;
        pdfCleanup?: {
          deleted: number;
          protectedRecent: number;
          failed: boolean;
        };
        error?: string;
      };

      if (!response.ok || !result.content) {
        throw new Error(result.error ?? "儲存失敗");
      }

      setDraft(result.content);
      setSaved(JSON.stringify(result.content));
      setBaseUpdatedAt(result.savedAt ?? null);
      const cleanupMessage = result.pdfCleanup?.failed
        ? "已儲存，但 PDF 清理暫時失敗；下次儲存時會再試一次"
        : result.pdfCleanup?.deleted
          ? `已儲存，並清理 ${result.pdfCleanup.deleted} 份未使用的 PDF`
          : "已儲存，重新整理網站即可看到最新內容";
      setStatus({
        kind: "success",
        message: cleanupMessage,
      });
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "儲存失敗",
      });
    }
  };

  return { draft, setDraft, status, setStatus, markChanged, updateRoot, save, dirty };
}

export function StudioSaveBar({
  status,
  busy = false,
  dirty = false,
}: {
  status: Status;
  busy?: boolean;
  dirty?: boolean;
}) {
  const message = status.message || (dirty ? "" : "尚未有變更");
  return (
    <div className="studio-actions">
      <div className="studio-status-group" aria-live="polite">
        {dirty && status.kind !== "saving" ? (
          <span className="studio-dirty">
            <i aria-hidden="true" />
            有尚未儲存的變更
          </span>
        ) : null}
        {message ? <span className={`studio-status ${status.kind}`}>{message}</span> : null}
        {status.kind === "success" && !dirty ? (
          <a className="studio-status-link" href="/" target="_blank" rel="noopener">
            查看網站 ↗
          </a>
        ) : null}
      </div>
      <button
        className="button"
        type="submit"
        disabled={status.kind === "saving" || busy}
      >
        {status.kind === "saving" ? "處理中…" : "儲存並更新網站"}
      </button>
    </div>
  );
}
