"use client";

import { useId, useState } from "react";
import type { Trip, TripPlan } from "@/lib/site-content";
import { formatDepartureDate } from "@/lib/trip-values";
import { tripPlanLabel } from "@/lib/trip-plans";
import { validateDepartureBatch, type DepartureBatchRow } from "@/lib/departure-batch";

// single：行程只有一個版本時，不需要談「加入哪個版本」，說明文字改成簡單版。
export function DepartureBatchEditor({ trip, plan, todayTime, onAdd, single = false }: {
  trip: Trip;
  plan: TripPlan;
  todayTime: number;
  onAdd: (rows: DepartureBatchRow[]) => string | null;
  single?: boolean;
}) {
  const id = useId();
  const [month, setMonth] = useState(() => new Date(todayTime).toISOString().slice(0, 7));
  const [selected, setSelected] = useState<string[]>([]);
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState<DepartureBatchRow[] | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [year, monthNumber] = month.split("-").map(Number);
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const offset = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  const validation = preview ? validateDepartureBatch(trip, plan.id, preview) : null;
  const invalidate = () => { setPreview(null); setError(""); setMessage(""); };
  const shiftMonth = (offset: number) => {
    const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
    if (date.getUTCFullYear() >= 1900 && date.getUTCFullYear() <= 9999) setMonth(date.toISOString().slice(0, 7));
  };
  const changePreview = (index: number, key: keyof DepartureBatchRow, value: string) => {
    setPreview(rows => rows?.map((row, i) => i === index ? { ...row, [key]: value } : row) ?? null);
    setError("");
  };
  return (
    <details className="departure-batch-editor">
      <summary>{single ? "＋ 用月曆一次新增多個團期" : "＋ 用月曆批次新增團期到此版本"}</summary>
      {single ? <p>日期不規則也能一次新增。</p> : <p>套用到：<strong>{tripPlanLabel(plan)}</strong>。日期不規則也能一次新增。</p>}
        <div className="batch-month-nav">
          <button type="button" aria-label="上一個月" onClick={() => shiftMonth(-1)}>←</button>
          <label>選擇月份<input type="month" value={month} min="1900-01" max="9999-12" onChange={event => { if (/^\d{4}-\d{2}$/.test(event.target.value)) setMonth(event.target.value); }} /></label>
          <button type="button" aria-label="下一個月" onClick={() => shiftMonth(1)}>→</button>
        </div>
        <div className="batch-calendar" role="group" aria-label={`${year} 年 ${monthNumber} 月出發日期，多選`}>
          {["日", "一", "二", "三", "四", "五", "六"].map(day => <span key={day}>{day}</span>)}
          {Array.from({ length: offset }, (_, index) => <span key={`empty-${index}`} aria-hidden="true" />)}
          {Array.from({ length: days }, (_, index) => {
            const date = `${year}/${String(monthNumber).padStart(2, "0")}/${String(index + 1).padStart(2, "0")}`;
            return <button type="button" key={date} aria-label={date} aria-pressed={selected.includes(date)} onClick={() => { setSelected(dates => dates.includes(date) ? dates.filter(d => d !== date) : [...dates, date].sort()); invalidate(); }}>{index + 1}</button>;
          })}
        </div>
        <p aria-live="polite">已選 {selected.length} 個日期（可跨月）</p>
        {selected.length > 0 && <div className="batch-selected-dates">{selected.map(date => <button type="button" key={date} aria-label={`取消 ${date}`} onClick={() => { setSelected(dates => dates.filter(d => d !== date)); invalidate(); }}>{date} ×</button>)}</div>}
        <div className="field-grid">
          <label className="field">共同價格（NT$／人）<input inputMode="numeric" value={price} placeholder="例如：32900" onChange={event => { setPrice(event.target.value); invalidate(); }} /></label>
          <label className="field">共同備註（選填）<input value={note} maxLength={120} placeholder="例如：加開團期" onChange={event => { setNote(event.target.value); invalidate(); }} /></label>
        </div>
      <button className="button button-secondary button-small" type="button" onClick={() => {
        setError(""); setMessage("");
        setPreview(selected.map(date => ({ date, price, note })));
      }}>預覽這批團期</button>
      {error && <p className="batch-error" role="alert">{error}</p>}
      {preview && validation && <div className="batch-preview">
        <h5>預覽 {preview.length} 個團期</h5>
        <p>可修改個別價格、日期與備註，或移除不需要的列。</p>
        {validation.error && <p className="batch-error" role="alert">{validation.error}</p>}
        {preview.map((row, index) => <div className="batch-preview-row" key={index}>
          <label className="field">日期<input value={row.date} aria-invalid={Boolean(validation.issues[index])} aria-describedby={validation.issues[index] ? `${id}-${index}` : undefined} onChange={event => changePreview(index, "date", event.target.value)} onBlur={() => changePreview(index, "date", formatDepartureDate(row.date))} /></label>
          <label className="field">價格（NT$）<input inputMode="numeric" value={row.price} onChange={event => changePreview(index, "price", event.target.value)} /></label>
          <label className="field">備註<input value={row.note ?? ""} maxLength={120} onChange={event => changePreview(index, "note", event.target.value)} /></label>
          <button type="button" className="batch-remove" aria-label={`移除第 ${index + 1} 列`} onClick={() => { setPreview(rows => rows?.filter((_, i) => i !== index) ?? null); setError(""); }}>移除</button>
          {validation.issues[index] && <p id={`${id}-${index}`} className="batch-error" role="alert">第 {index + 1} 列：{validation.issues[index]}</p>}
        </div>)}
        <p className="batch-assignment-note">{single ? "這批日期會直接套用到這份行程文件，加入後請按最下方的儲存。" : "這批日期僅加入此版本。既有版本的團期對應會保留；原本「適用所有團期」會改為指定目前日期，往後新增的日期需另外套用。"}</p>
        <button type="button" className="button button-small" disabled={!validation.valid} onClick={() => {
          const result = onAdd(preview);
          if (result) { setError(result); return; }
          setMessage(single ? `已將 ${preview.length} 個團期加入草稿，請按儲存更新網站。` : `已將 ${preview.length} 個團期加入「${tripPlanLabel(plan)}」草稿，請按儲存更新網站。`);
          setPreview(null); setSelected([]); setError("");
        }}>{single ? `將 ${preview.length} 個團期加入草稿` : `將 ${preview.length} 個團期加入此版本草稿`}</button>
      </div>}
      {message && <p className="batch-success" role="status">{message}</p>}
    </details>
  );
}
