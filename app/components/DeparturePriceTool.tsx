"use client";

import { useState } from "react";
import type { Trip } from "@/lib/site-content";
import {
  adjustDeparturePrices,
  isValidAdjustmentAmount,
  upcomingMonthCounts,
  type PriceAdjustment,
} from "@/lib/departure-tools";

// 旺季調價、匯率調整時，不用一個團期一個團期改。只動還沒出發的團期，
// 套用後只是改草稿，按最下方的儲存才會更新網站。
export function DeparturePriceTool({
  trip,
  todayTime,
  onApply,
}: {
  trip: Trip;
  todayTime: number;
  onApply: (trip: Trip) => void;
}) {
  const [scope, setScope] = useState("all");
  const [mode, setMode] = useState<PriceAdjustment["mode"]>("add");
  const [amountText, setAmountText] = useState("");
  const [message, setMessage] = useState("");

  const months = upcomingMonthCounts(trip, todayTime);
  const upcomingTotal = months.reduce((sum, [, count]) => sum + count, 0);
  const amount = Number(amountText.replace(/,/g, ""));
  const valid = amountText.trim() !== "" && isValidAdjustmentAmount(amount);
  const result = valid
    ? adjustDeparturePrices(trip, { scope: months.some(([key]) => key === scope) ? scope : "all", mode, amount }, todayTime)
    : null;

  if (upcomingTotal === 0) return null;

  return (
    <details className="departure-price-tool">
      <summary>批次調整價格（只動還沒出發的團期）</summary>
      <div className="field-grid">
        <label className="field">
          <span>要調整哪些團期</span>
          <select value={scope} onChange={(event) => { setScope(event.target.value); setMessage(""); }}>
            <option value="all">全部還沒出發的團期（{upcomingTotal} 個）</option>
            {months.map(([key, count]) => (
              <option key={key} value={key}>
                只調整 {key} 的團期（{count} 個）
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>調整方式</span>
          <select value={mode} onChange={(event) => { setMode(event.target.value as PriceAdjustment["mode"]); setMessage(""); }}>
            <option value="add">每個團期加價</option>
            <option value="subtract">每個團期減價</option>
            <option value="set">全部改成同一個價格</option>
          </select>
        </label>
        <label className="field">
          <span>{mode === "set" ? "新的價格（NT$／人）" : "金額（NT$）"}</span>
          <input
            inputMode="numeric"
            placeholder={mode === "set" ? "例如：35900" : "例如：2000"}
            value={amountText}
            onChange={(event) => { setAmountText(event.target.value); setMessage(""); }}
          />
        </label>
      </div>

      {amountText.trim() !== "" && !valid ? (
        <p className="batch-error" role="alert">請輸入 1 到 9,999,999 之間的整數金額。</p>
      ) : null}
      {result ? (
        result.changed > 0 ? (
          <p className="departure-price-preview" role="status">
            會調整 <b>{result.changed}</b> 個團期。例如 {result.example?.date}：{result.example?.from} → <b>{result.example?.to}</b>
            {result.skipped > 0 ? `。另有 ${result.skipped} 個團期的價格不是數字或會變成 0 以下，不會調整` : ""}
            。
          </p>
        ) : (
          <p className="batch-error" role="status">
            這樣設定不會改到任何團期{result.skipped > 0 ? `（有 ${result.skipped} 個團期的價格不是數字或會變成 0 以下）` : ""}。
          </p>
        )
      ) : null}
      {trip.plans.length > 1 ? (
        <p className="departure-price-note">團期價格由各版本共用，調整後會影響所有套用該團期的版本。</p>
      ) : null}

      <button
        type="button"
        className="button button-small"
        disabled={!result || result.changed === 0}
        onClick={() => {
          if (!result || result.changed === 0) return;
          onApply(result.trip);
          setMessage(`已調整 ${result.changed} 個團期的價格，請按最下方的儲存才會更新網站。`);
          setAmountText("");
        }}
      >
        {result && result.changed > 0 ? `套用到 ${result.changed} 個團期` : "套用"}
      </button>
      {message ? <p className="batch-success" role="status">{message}</p> : null}
    </details>
  );
}
