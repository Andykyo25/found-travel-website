"use client";

import { useMemo, useState } from "react";
import {
  contactTimeSlotLabel,
  type ContactRequest,
  type ManagedContactRequest,
} from "@/lib/contact-fields";
import { escapeCsvCell } from "@/lib/csv";

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
  const header = ["時間日期", "聯絡人", "行動電話", "希望聯繫時段", "內容"];
  const rows = requests.map((request) => [
    formatReceivedAt(request.createdAt),
    request.name,
    request.mobile,
    request.preferredTimes.map(contactTimeSlotLabel).join(" / "),
    request.message,
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
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const filtered = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((request) =>
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
  }, [items, keyword]);

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

  return (
    <>
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
            : "沒有符合搜尋條件的資料。"}
        </div>
      ) : (
        <div className="contact-table-wrap">
          <table className="contact-table">
            <thead>
              <tr>
                <th>時間日期</th>
                <th>聯絡人</th>
                <th>行動電話</th>
                <th>希望聯繫時段</th>
                <th>內容</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((request) => (
                <tr key={request.id}>
                  <td className="contact-cell-time">
                    {formatReceivedAt(request.createdAt)}
                  </td>
                  <td>
                    <span className="contact-name">{request.name}</span>
                  </td>
                  <td className="contact-cell-mobile">
                    <a href={`tel:${request.mobile.replace(/\s/g, "")}`}>
                      {request.mobile}
                    </a>
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
