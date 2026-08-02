"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  contactTimeSlots,
  type ContactTimeSlotId,
} from "@/lib/contact-fields";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "error"; message: string }
  | { kind: "success" };

export function ContactForm({ lineUrl }: { lineUrl: string }) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [preferredTimes, setPreferredTimes] = useState<ContactTimeSlotId[]>([]);
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const togglePreferredTime = (id: ContactTimeSlotId) => {
    setPreferredTimes((current) =>
      current.includes(id)
        ? current.filter((slot) => slot !== id)
        : [...current, id],
    );
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preferredTimes.length === 0) {
      setStatus({ kind: "error", message: "請選擇希望聯繫時段" });
      return;
    }

    setStatus({ kind: "sending" });
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          mobile,
          preferredTimes,
          message,
          company,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "送出失敗");
      setStatus({ kind: "success" });
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "送出失敗",
      });
    }
  }

  if (status.kind === "success") {
    return (
      <div className="contact-success" role="status">
        <span className="contact-success-mark" aria-hidden="true">
          ✓
        </span>
        <h2>已收到您的諮詢</h2>
        <p>
          我們已將您的需求轉給業務顧問，會在您希望的時段主動與您聯繫。
          若有急件，也歡迎直接透過 LINE 找我們。
        </p>
        <div className="contact-success-actions">
          <a className="button" href={lineUrl} target="_blank" rel="noreferrer">
            LINE 聯絡顧問 <span aria-hidden="true">↗</span>
          </a>
          <Link className="button button-secondary" href="/">
            回到首頁
          </Link>
        </div>
      </div>
    );
  }

  const sending = status.kind === "sending";

  return (
    <form className="contact-form" onSubmit={submit}>
      <div className="field-grid">
        <label className="field">
          <span>
            聯絡人 <b className="field-required">*</b>
          </span>
          <input
            name="name"
            autoComplete="name"
            placeholder="您的姓名或稱呼"
            maxLength={60}
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label className="field">
          <span>
            行動電話 <b className="field-required">*</b>
          </span>
          <input
            name="mobile"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0912345678"
            maxLength={40}
            required
            value={mobile}
            onChange={(event) => setMobile(event.target.value)}
          />
        </label>

        <fieldset className="field-wide contact-slots">
          <legend>
            希望聯繫時段 <b className="field-required">*</b>
            <small>可複選，我們會盡量在您方便的時間來電</small>
          </legend>
          <div className="contact-slot-options">
            {contactTimeSlots.map((slot) => (
              <label
                key={slot.id}
                className={`contact-slot${
                  preferredTimes.includes(slot.id) ? " on" : ""
                }`}
              >
                <input
                  type="checkbox"
                  name="preferredTimes"
                  value={slot.id}
                  checked={preferredTimes.includes(slot.id)}
                  onChange={() => togglePreferredTime(slot.id)}
                />
                <span>{slot.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="field field-wide">
          <span>
            諮詢內容 <b className="field-required">*</b>
          </span>
          <small>
            想去的地方、預計出發日期、同行人數，愈具體我們愈能給您合適的建議。
          </small>
          <textarea
            name="message"
            placeholder="例：想瞭解 9/19 後的日本團有無出發，兩位大人。"
            maxLength={1000}
            required
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </label>
      </div>

      {/* 蜜罐欄位：僅機器人會填寫，一般客人看不到。 */}
      <div className="contact-honeypot" aria-hidden="true">
        <label>
          公司名稱
          <input
            name="company"
            tabIndex={-1}
            autoComplete="off"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
          />
        </label>
      </div>

      {status.kind === "error" ? (
        <p className="contact-form-status error" role="alert">
          {status.message}
        </p>
      ) : null}

      <div className="contact-form-actions">
        <button className="button" type="submit" disabled={sending}>
          {sending ? "送出中…" : "送出諮詢"}
        </button>
        <small>
          送出即表示同意我們以您留下的電話與您聯繫，資料僅用於本次旅遊諮詢。
        </small>
      </div>
    </form>
  );
}
