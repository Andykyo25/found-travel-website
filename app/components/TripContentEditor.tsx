"use client";

import { useState } from "react";
import type { Trip, TripDay, TripFaq } from "@/lib/site-content";
import { parseItineraryText } from "@/lib/trip-itinerary";
import { Field } from "./StudioDraft";

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

function move<T>(items: T[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

// 行程頁上給旅客與搜尋引擎讀的內容。全部選填；沒填的區塊前台不顯示。
export function TripContentEditor({
  trip,
  onChange,
}: {
  trip: Trip;
  onChange: (patch: Partial<Trip>) => void;
}) {
  const days = trip.itinerary ?? [];
  const faqs = trip.faqs ?? [];
  const [paste, setPaste] = useState("");
  const [pasteMessage, setPasteMessage] = useState("");

  const setDays = (itinerary: TripDay[]) => onChange({ itinerary });
  const updateDay = (index: number, key: keyof Omit<TripDay, "id">, value: string) =>
    setDays(days.map((day, dayIndex) => (dayIndex === index ? { ...day, [key]: value } : day)));
  const setFaqs = (next: TripFaq[]) => onChange({ faqs: next });
  const updateFaq = (index: number, key: "question" | "answer", value: string) =>
    setFaqs(faqs.map((faq, faqIndex) => (faqIndex === index ? { ...faq, [key]: value } : faq)));

  const applyPaste = () => {
    const parsed = parseItineraryText(paste);
    if (parsed.length === 0) {
      setPasteMessage("找不到「第1天」「Day 1」或「D1」開頭的行，請確認貼上的內容包含每天的標題。");
      return;
    }
    if (
      days.length > 0 &&
      !window.confirm(`會用拆出來的 ${parsed.length} 天，取代目前已填的 ${days.length} 天。確定嗎？`)
    )
      return;
    setDays(parsed.map((day) => ({ id: newId(), ...day })));
    setPaste("");
    setPasteMessage(`已拆成 ${parsed.length} 天。請逐天檢查標題、餐食與住宿，最後按「儲存並更新網站」。`);
  };

  const filled = [
    days.length ? `每日行程 ${days.length} 天` : "",
    trip.includes?.trim() || trip.excludes?.trim() ? "費用說明" : "",
    trip.notes?.trim() ? "注意事項" : "",
    faqs.length ? `常見問題 ${faqs.length} 題` : "",
  ].filter(Boolean);

  return (
    <details className="field-wide trip-content-editor">
      <summary>
        <span>行程內容（每日行程、費用說明、常見問題）</span>
        <small>{filled.length ? `已填：${filled.join("・")}` : "尚未填寫・會直接顯示在行程頁，搜尋引擎與 AI 也讀得到"}</small>
      </summary>

      <div className="trip-content-body">
        <p className="trip-content-intro">
          PDF 裡的內容搜尋引擎讀不到。把重點放在這裡，行程頁就會出現「每日行程」「費用說明」「常見問題」區塊；
          沒填的區塊不會顯示。
        </p>

        <h4>每日行程</h4>
        <details className="trip-content-paste">
          <summary>從 PDF 複製整段行程，自動拆成每天</summary>
          <Field
            label="貼上行程文字"
            hint="每天的開頭要有「第1天」「Day 1」或「D1」。「早餐／午餐／晚餐」開頭的行會放進餐食，「住宿：」開頭的行會放進住宿。"
            wide
          >
            <textarea
              rows={8}
              value={paste}
              placeholder={"第1天 台北→札幌\n搭乘直飛班機前往北海道…\n早餐：— 午餐：機上 晚餐：螃蟹吃到飽\n住宿：札幌京王廣場酒店或同級\n第2天 小樽運河…"}
              onChange={(event) => setPaste(event.target.value)}
            />
          </Field>
          <div className="trip-content-actions">
            <button type="button" className="button button-secondary button-small" onClick={applyPaste} disabled={!paste.trim()}>
              拆成每日行程
            </button>
          </div>
        </details>
        {pasteMessage ? (
          <p className="trip-content-status" role="status">
            {pasteMessage}
          </p>
        ) : null}

        <ol className="trip-day-editor-list">
          {days.map((day, index) => (
            <li key={day.id} className="trip-day-editor">
              <div className="trip-day-editor-head">
                <strong>第 {index + 1} 天</strong>
                <div className="trip-editor-actions">
                  <button type="button" onClick={() => setDays(move(days, index, -1))} disabled={index === 0} aria-label={`第 ${index + 1} 天往前移`}>
                    ↑
                  </button>
                  <button type="button" onClick={() => setDays(move(days, index, 1))} disabled={index === days.length - 1} aria-label={`第 ${index + 1} 天往後移`}>
                    ↓
                  </button>
                  <button type="button" className="danger" onClick={() => setDays(days.filter((_, dayIndex) => dayIndex !== index))}>
                    刪除
                  </button>
                </div>
              </div>
              <div className="field-grid">
                <Field label="當天標題" wide>
                  <input value={day.title} placeholder="例如：台北→札幌・小樽運河" onChange={(event) => updateDay(index, "title", event.target.value)} />
                </Field>
                <Field label="當天說明" wide>
                  <textarea value={day.description} placeholder="景點、交通與自由活動安排" onChange={(event) => updateDay(index, "description", event.target.value)} />
                </Field>
                <Field label="餐食">
                  <input value={day.meals} placeholder="例如：早餐 飯店內／晚餐 螃蟹吃到飽" onChange={(event) => updateDay(index, "meals", event.target.value)} />
                </Field>
                <Field label="住宿">
                  <input value={day.hotel} placeholder="例如：札幌京王廣場酒店或同級" onChange={(event) => updateDay(index, "hotel", event.target.value)} />
                </Field>
              </div>
            </li>
          ))}
        </ol>
        <div className="trip-content-actions">
          <button type="button" className="button button-secondary button-small" onClick={() => setDays([...days, { id: newId(), title: "", description: "", meals: "", hotel: "" }])}>
            ＋ 新增一天
          </button>
        </div>

        <h4>費用說明與注意事項</h4>
        <div className="field-grid">
          <Field label="費用包含" hint="每行一項，例如：來回經濟艙機票">
            <textarea value={trip.includes ?? ""} onChange={(event) => onChange({ includes: event.target.value })} />
          </Field>
          <Field label="費用不含" hint="每行一項，例如：領隊與司機小費">
            <textarea value={trip.excludes ?? ""} onChange={(event) => onChange({ excludes: event.target.value })} />
          </Field>
          <Field label="注意事項" hint="每行一項，例如：護照效期需 6 個月以上" wide>
            <textarea value={trip.notes ?? ""} onChange={(event) => onChange({ notes: event.target.value })} />
          </Field>
        </div>

        <h4>常見問題</h4>
        <p className="trip-content-intro">寫下客人最常問的問題，例如「幾月看得到流冰？」「長輩走得動嗎？」。AI 搜尋特別會引用這種問答。</p>
        <ol className="trip-day-editor-list">
          {faqs.map((faq, index) => (
            <li key={faq.id} className="trip-day-editor">
              <div className="trip-day-editor-head">
                <strong>問題 {index + 1}</strong>
                <div className="trip-editor-actions">
                  <button type="button" className="danger" onClick={() => setFaqs(faqs.filter((_, faqIndex) => faqIndex !== index))}>
                    刪除
                  </button>
                </div>
              </div>
              <div className="field-grid">
                <Field label="問題" wide>
                  <input value={faq.question} onChange={(event) => updateFaq(index, "question", event.target.value)} />
                </Field>
                <Field label="回答" hint="問題和回答都要填，才會顯示在網站上。" wide>
                  <textarea value={faq.answer} onChange={(event) => updateFaq(index, "answer", event.target.value)} />
                </Field>
              </div>
            </li>
          ))}
        </ol>
        <div className="trip-content-actions">
          <button type="button" className="button button-secondary button-small" onClick={() => setFaqs([...faqs, { id: newId(), question: "", answer: "" }])}>
            ＋ 新增問題
          </button>
        </div>
      </div>
    </details>
  );
}
