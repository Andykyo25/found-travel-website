"use client";

import { FormEvent, useState } from "react";

type LoginStatus = {
  kind: "idle" | "loading" | "error";
  message: string;
};

export function StudioLoginForm() {
  const [status, setStatus] = useState<LoginStatus>({
    kind: "idle",
    message: "",
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus({ kind: "loading", message: "登入中…" });

    try {
      const response = await fetch("/api/studio/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "登入失敗");
      window.location.assign("/studio");
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "登入失敗",
      });
    }
  }

  return (
    <form className="studio-login-form" onSubmit={submit}>
      <label className="field">
        <span>Email</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          placeholder="name@example.com"
          required
        />
      </label>
      <label className="field">
        <span>密碼</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          minLength={10}
          required
        />
      </label>
      {status.message ? (
        <p
          className={`studio-login-status ${status.kind}`}
          role={status.kind === "error" ? "alert" : "status"}
        >
          {status.message}
        </p>
      ) : null}
      <button
        className="button studio-login-button"
        type="submit"
        disabled={status.kind === "loading"}
      >
        {status.kind === "loading" ? "登入中…" : "登入內容管理"}
      </button>
    </form>
  );
}
