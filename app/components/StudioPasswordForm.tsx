"use client";

import { FormEvent, useState } from "react";

type Status = { kind: "idle" | "saving" | "success" | "error"; message: string };

const minLength = 10;

export function StudioPasswordForm({ canChange }: { canChange: boolean }) {
  const [status, setStatus] = useState<Status>({ kind: "idle", message: "" });
  const [reveal, setReveal] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const currentPassword = String(data.get("currentPassword") ?? "");
    const newPassword = String(data.get("newPassword") ?? "");
    const confirmPassword = String(data.get("confirmPassword") ?? "");

    if (newPassword !== confirmPassword) {
      setStatus({ kind: "error", message: "兩次輸入的新密碼不一樣，請再確認一次" });
      return;
    }
    setStatus({ kind: "saving", message: "儲存中…" });
    try {
      const response = await fetch("/api/studio/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "密碼更新失敗");
      form.reset();
      setStatus({ kind: "success", message: "密碼已更新。下次登入請使用新密碼。" });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "密碼更新失敗" });
    }
  }

  if (!canChange) {
    return (
      <p className="studio-password-note">
        目前無法在這裡修改密碼（資料儲存空間尚未設定完成）。需要換密碼請聯絡網站管理者。
      </p>
    );
  }

  const type = reveal ? "text" : "password";
  return (
    <form className="studio-password-form" onSubmit={submit}>
      <label className="field">
        <span>目前的密碼</span>
        <input name="currentPassword" type={type} autoComplete="current-password" required />
      </label>
      <label className="field">
        <span>新密碼</span>
        <small>至少 {minLength} 個字元，開頭和結尾不要有空白。建議用好記的一句話，不要和其他網站共用。</small>
        <input name="newPassword" type={type} autoComplete="new-password" minLength={minLength} maxLength={128} required />
      </label>
      <label className="field">
        <span>再輸入一次新密碼</span>
        <input name="confirmPassword" type={type} autoComplete="new-password" minLength={minLength} maxLength={128} required />
      </label>
      <label className="studio-password-reveal">
        <input type="checkbox" checked={reveal} onChange={(event) => setReveal(event.target.checked)} />
        顯示密碼
      </label>
      {status.message ? (
        <p className={`studio-login-status ${status.kind === "error" ? "error" : status.kind}`} role={status.kind === "error" ? "alert" : "status"}>
          {status.message}
        </p>
      ) : null}
      <button className="button" type="submit" disabled={status.kind === "saving"}>
        {status.kind === "saving" ? "儲存中…" : "更新密碼"}
      </button>
    </form>
  );
}
