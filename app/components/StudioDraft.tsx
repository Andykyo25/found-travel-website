"use client";

import { useState } from "react";
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

  const markChanged = () => {
    setStatus({ kind: "idle", message: "有尚未儲存的變更" });
  };

  const updateRoot = <K extends keyof SiteContent>(
    key: K,
    value: SiteContent[K],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
    markChanged();
  };

  const save = async () => {
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

  return { draft, setDraft, status, setStatus, markChanged, updateRoot, save };
}

export function StudioSaveBar({
  status,
  busy = false,
}: {
  status: Status;
  busy?: boolean;
}) {
  return (
    <div className="studio-actions">
      <span className={`studio-status ${status.kind}`}>{status.message}</span>
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
