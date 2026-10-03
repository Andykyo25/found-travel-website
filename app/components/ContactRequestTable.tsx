"use client";

import { useMemo, useState } from "react";
import {
  contactTimeSlotLabel,
  type ContactRequest,
  type ManagedContactRequest,
} from "@/lib/contact-fields";
import { escapeCsvCell } from "@/lib/csv";
import { countContactHandling, handlerLabel } from "@/lib/contact-handling";

type HandlingFilter = "pending" | "contacted" | "all";

// 固定用台北時間並自行組字串，避免伺服端與瀏覽器格式不一致造成 hydration 警告。
const taipeiParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Taipei",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatReceivedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const parts = Object.fromEntries(
    taipeiParts
      .formatToParts(date)
      .map((part) => [part.type, part.value] as const),
  );
  return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`;
}

function downloadCsv(requests: ContactRequest[]) {
  const header = ["時間日期", "聯絡人", "行動電話", "希望聯繫時段", "內容", "處理狀態", "處理人與時間"];
  const rows = requests.map((request) => [
    formatReceivedAt(request.createdAt),
    request.name,
    request.mobile,
    request.preferredTimes.map(contactTimeSlotLabel).join(" / "),
    request.message,
    request.handling ? "已聯絡" : "待處理",
    request.handling ? `${handlerLabel(request.handling.by)} ${formatReceivedAt(request.handling.at)}` : "",
  ]);

  const body = [header, ...rows]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\r\n");

  // 前置 BOM，Excel 開啟才不會把中文顯示成亂碼。
  const url = URL.createObjectURL(
    new Blob([`﻿${body}`], { type: "text/csv;charset=utf-8;" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `聯絡諮詢-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ContactRequestTable({
  requests,
}: {
  requests: ManagedContactRequest[];
}) {
  const [keyword, setKeyword] = useState("");
  const [items, setItems] = useState(requests);
  // 有待處理的就先看待處理；全部都處理完了才顯示全部。
  const [filter, setFilter] = useState<HandlingFilter>(() =>
    requests.some((request) => !request.handling) ? "pending" : "all",
  );
  const [markingKeys, setMarkingKeys] = useState<string[]>([]);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [retryingKey, setRetryingKey] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const counts = useMemo(() => countContactHandling(items), [items]);

  const filtered = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    const byStatus = items.filter((request) =>
      filter === "all" ? true : filter === "contacted" ? Boolean(request.handling) : !request.handling,
    );
    if (!needle) return byStatus;
    return byStatus.filter((request) =>
      [
        request.name,
        request.mobile,
        request.message,
        ...request.preferredTimes.map(contactTimeSlotLabel),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [items, keyword, filter]);

  // 標記已聯絡／改回待處理。一次可送多筆（「全部標為已聯絡」）。
  const markHandling = async (
    targets: ManagedContactRequest[],
    state: "contacted" | "new",
  ) => {
    const keys = targets.map((request) => request.storageKey);
    setMarkingKeys(keys);
    setDeleteError("");
    try {
      const response = await fetch("/api/studio/contacts", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ keys, state }),
      });
      const result = (await response.json()) as {
        updated?: Array<{ key: string; handling: { by: string; at: string } | null }>;
        failed?: number;
        error?: string;
      };
      if (!response.ok || !result.updated) throw new Error(result.error ?? "更新失敗");
      const changes = new Map(result.updated.map((item) => [item.key, item.handling]));
      setItems((current) =>
        current.map((item) =>
          changes.has(item.storageKey)
            ? { ...item, handling: changes.get(item.storageKey) ?? undefined }
            : item,
        ),
      );
      if (result.failed) setDeleteError(`有 ${result.failed} 筆沒有更新成功，請再試一次。`);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "更新失敗，請稍後再試");
    } finally {
      setMarkingKeys([]);
    }
  };

  const markAllContacted = () => {
    const targets = filtered.filter((request) => !request.handling);
    if (
      targets.length === 0 ||
      !window.confirm(
        `確定把目前列表的 ${targets.length} 筆都標為「已聯絡」嗎？這不會通知客人，只是讓團隊知道哪些已經處理過。`,
      )
    ) {
      return;
    }
    void markHandling(targets, "contacted");
  };

  const deleteRequest = async (request: ManagedContactRequest) => {
    if (
      !window.confirm(
        `確定刪除「${request.name}」於 ${formatReceivedAt(request.createdAt)} 送出的詢問單嗎？此操作無法復原。`,
      )
    ) {
      return;
    }

    setDeletingKey(request.storageKey);
    setDeleteError("");

    try {
      const response = await fetch("/api/studio/contacts", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: request.storageKey }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "刪除失敗");
      }

      setItems((current) =>
        current.filter((item) => item.storageKey !== request.storageKey),
      );
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "刪除失敗，請稍後再試",
      );
    } finally {
      setDeletingKey(null);
    }
  };

  const retryNotification = async (request: ManagedContactRequest) => {
    setRetryingKey(request.storageKey);
    setDeleteError("");
    try {
      const response = await fetch("/api/studio/contacts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: request.storageKey }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "補送失敗");
      setItems((items) =>
        items.map((item) =>
          item.storageKey === request.storageKey
            ? { ...item, notification: result.notification }
            : item,
        ),
      );
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "補送失敗");
    } finally {
      setRetryingKey(null);
    }
  };

  return (
    <>
      <div className="contact-status-filter" role="group" aria-label="依處理狀態篩選">
        {(
          [
            ["pending", "待處理", counts.pending],
            ["contacted", "已聯絡", counts.contacted],
            ["all", "全部", items.length],
          ] as const
        ).map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            className={`trip-filter-pill${filter === id ? " active" : ""}`}
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
          >
            {label}
            <small>{count}</small>
          </button>
        ))}
        {filter === "pending" && filtered.length > 1 ? (
          <button
            type="button"
            className="button button-secondary button-small"
            disabled={markingKeys.length > 0}
            onClick={markAllContacted}
          >
            全部標為已聯絡（{filtered.length}）
          </button>
        ) : null}
      </div>

      <div className="contact-table-toolbar">
        <input
          className="contact-search"
          type="search"
          placeholder="搜尋姓名、電話或內容"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          aria-label="搜尋聯絡諮詢"
        />
        <div className="contact-toolbar-actions">
          <span className="contact-count">
            {keyword.trim()
              ? `符合 ${filtered.length} / 共 ${items.length} 筆`
              : `共 ${items.length} 筆`}
          </span>
          <button
            className="button button-secondary button-small"
            type="button"
            onClick={() => downloadCsv(filtered)}
            disabled={filtered.length === 0}
          >
            匯出 CSV
          </button>
        </div>
      </div>

      {deleteError ? (
        <p className="contact-delete-error" role="alert">
          {deleteError}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <div className="contact-table-empty">
          {items.length === 0
            ? "目前還沒有客人填寫聯絡表單。"
            : keyword.trim()
              ? "沒有符合搜尋條件的資料。"
              : filter === "pending"
                ? "太好了，目前沒有待處理的詢問。"
                : "這個分類目前沒有資料。"}
        </div>
      ) : (
        <div className="contact-table-wrap">
          <table className="contact-table">
            <thead>
              <tr>
                <th>處理狀態</th>
                <th>客人</th>
                <th>希望聯繫時段</th>
                <th>內容</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((request) => {
                const marking = markingKeys.includes(request.storageKey);
                const notice = request.notification?.state;
                return (
                  <tr key={request.id} className={request.handling ? "is-contacted" : "is-pending"}>
                    <td className="contact-cell-status">
                      {request.handling ? (
                        <>
                          <span className="contact-state contacted">已聯絡</span>
                          <small>
                            {handlerLabel(request.handling.by)} ・ {formatReceivedAt(request.handling.at).slice(5)}
                          </small>
                          <button
                            type="button"
                            className="contact-undo"
                            disabled={markingKeys.length > 0}
                            onClick={() => void markHandling([request], "new")}
                          >
                            {marking ? "更新中…" : "改回待處理"}
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="contact-state pending">待處理</span>
                          <button
                            type="button"
                            className="button button-small"
                            disabled={markingKeys.length > 0}
                            onClick={() => void markHandling([request], "contacted")}
                          >
                            {marking ? "更新中…" : "標示已聯絡"}
                          </button>
                        </>
                      )}
                      {notice && notice !== "delivered" ? (
                        <span className="contact-notice warn">
                          LINE 通知{notice === "failed" ? "失敗" : "處理中"}
                          <button
                            type="button"
                            disabled={retryingKey !== null}
                            onClick={() => void retryNotification(request)}
                          >
                            {retryingKey === request.storageKey ? "補送中…" : "補送"}
                          </button>
                        </span>
                      ) : null}
                    </td>
                    <td className="contact-cell-customer">
                      <span className="contact-name">{request.name}</span>
                      <a className="contact-phone" href={`tel:${request.mobile.replace(/\s/g, "")}`}>
                        {request.mobile}
                      </a>
                      <small>{formatReceivedAt(request.createdAt)}</small>
                    </td>
                    <td>
                      <span className="contact-slot-tags">
                        {request.preferredTimes.map((slot) => (
                          <span className="contact-slot-tag" key={slot}>
                            {contactTimeSlotLabel(slot)}
                          </span>
                        ))}
                      </span>
                    </td>
                    <td className="contact-cell-message">{request.message}</td>
                    <td className="contact-cell-actions">
                      <button
                        className="contact-delete-button"
                        type="button"
                        disabled={deletingKey !== null}
                        onClick={() => void deleteRequest(request)}
                        aria-label={`刪除${request.name}的詢問單`}
                      >
                        {deletingKey === request.storageKey ? "刪除中…" : "刪除"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
