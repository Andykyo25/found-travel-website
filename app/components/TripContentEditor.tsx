"use client";

import { useState } from "react";
import type { Trip, TripDay, TripFaq } from "@/lib/site-content";
import { copyPdfContent, parseItineraryText } from "@/lib/trip-itinerary";
import type { TripPdfTextStatus } from "@/lib/trip-pdf-extract";
import { tripPdfSource } from "@/lib/trip-plans";
import { tripPdfKeyFromDocumentUrl } from "@/lib/storage-keys";
import { Field } from "./StudioDraft";

type PdfLookup = TripPdfTextStatus | { status: "loading" };

// 上傳的行程 PDF 自動整理出的內容。業務在這裡確認抓得對不對，有錯再複製到下方修改。
function TripPdfPreview({
  hasPdf,
  planLabel,
  lookup,
  manualDays,
  onRecheck,
  onCopy,
  onClear,
}: {
  hasPdf: boolean;
  planLabel: string;
  lookup: PdfLookup | null;
  manualDays: number;
  onRecheck: () => void;
  onCopy: () => void;
  onClear: () => void;
}) {
  const recheck = (
    <button type="button" className="button button-secondary button-small" onClick={onRecheck}>
      重新檢查
    </button>
  );
  let body;
  if (!hasPdf) {
    body = <p className="trip-content-intro">這個行程還沒有上傳 PDF。上傳後，系統會自動整理出每日行程放在行程頁。</p>;
  } else if (!lookup || lookup.status === "loading") {
    body = <p className="trip-content-intro">正在讀取 PDF 的整理結果…</p>;
  } else if (lookup.status === "processing") {
    body = (
      <>
        <p className="trip-content-intro">PDF 正在整理中，通常幾秒鐘就好，請稍後按「重新檢查」。</p>
        <div className="trip-content-actions">{recheck}</div>
      </>
    );
  } else if (lookup.status === "failed") {
    body = <p className="trip-content-intro">這份 PDF 整理時出錯，系統 10 分鐘後會自動再試。需要的話可以先在下方手動填寫。</p>;
  } else if (lookup.status === "unreadable") {
    body = (
      <p className="trip-content-intro">
        這份 PDF 讀不到每日行程（可能是掃描檔，或排版系統還認不出來），行程頁只會放 PDF。需要的話請在下方手動填寫。
      </p>
    );
  } else if (lookup.status === "unavailable") {
    body = (
      <>
        <p className="trip-content-intro">暫時讀不到整理結果，請稍後再試。</p>
        <div className="trip-content-actions">{recheck}</div>
      </>
    );
  } else {
    const { days, includes, excludes } = lookup.content;
    const costs = [includes.length ? `費用包含 ${includes.length} 項` : "", excludes.length ? `不含 ${excludes.length} 項` : ""].filter(Boolean);
    body = (
      <>
        <p className="trip-pdf-summary">
          <strong>已整理出 {days.length} 天</strong>
          {costs.length ? `・${costs.join("・")}` : ""}
          {planLabel ? `（來源：「${planLabel}」的 PDF）` : ""}
        </p>
        <p className="trip-content-intro">
          {manualDays
            ? "目前行程頁用的是下方手動填寫的每日行程，不是這份。"
            : "行程頁目前就是顯示這份內容，不用另外填。有錯的話按「複製到下方修改」。"}
        </p>
        <details className="trip-pdf-days">
          <summary>查看每天的標題、餐食與住宿</summary>
          <ol>
            {days.map((day) => (
              <li key={day.day}>
                <b>第 {day.day} 天</b>
                <span>{day.title || "（沒抓到標題）"}</span>
                <small>
                  餐食：{day.meals || "—"}
                  <br />
                  住宿：{day.hotel || "—"}
                </small>
              </li>
            ))}
          </ol>
          {includes.length || excludes.length ? (
            <div className="trip-pdf-costs">
              {includes.length ? (
                <p>
                  <b>費用包含</b>
                  {includes.join("／")}
                </p>
              ) : null}
              {excludes.length ? (
                <p>
                  <b>費用不含</b>
                  {excludes.join("／")}
                </p>
              ) : null}
            </div>
          ) : null}
        </details>
        <div className="trip-content-actions">
          <button type="button" className="button button-secondary button-small" onClick={onCopy}>
            複製到下方修改
          </button>
          {manualDays ? (
            <button type="button" className="button button-secondary button-small" onClick={onClear}>
              清空手動內容，改回自動整理
            </button>
          ) : null}
        </div>
      </>
    );
  }

  return (
    <section className="trip-pdf-preview" aria-live="polite">
      <h4>從 PDF 自動整理</h4>
      {body}
    </section>
  );
}

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
  const pdfSource = tripPdfSource(trip, tripPdfKeyFromDocumentUrl);
  const [pdf, setPdf] = useState<{ key: string; lookup: PdfLookup } | null>(null);

  // 打開這個區塊時才去查 PDF 的整理結果，進後台時不會一次查十幾個行程。
  const loadPdf = async (key: string) => {
    setPdf({ key, lookup: { status: "loading" } });
    try {
      const response = await fetch(`/api/studio/pdf-text?key=${encodeURIComponent(key)}`, { cache: "no-store" });
      const result = (await response.json()) as TripPdfTextStatus;
      setPdf({ key, lookup: response.ok && result && "status" in result ? result : { status: "unavailable" } });
    } catch {
      setPdf({ key, lookup: { status: "unavailable" } });
    }
  };
  const pdfLookup = pdfSource && pdf?.key === pdfSource.pdfKey ? pdf.lookup : null;

  const copyFromPdf = () => {
    if (pdfLookup?.status !== "ready") return;
    const hasManual = days.length > 0 || Boolean(trip.includes?.trim()) || Boolean(trip.excludes?.trim());
    if (hasManual && !window.confirm("會用 PDF 整理的內容，取代下方已填的每日行程與費用說明。確定嗎？")) return;
    onChange(copyPdfContent(pdfLookup.content, newId));
    setPasteMessage(
      `已複製 ${pdfLookup.content.days.length} 天到下方。改好後按「儲存並更新網站」；之後行程頁就用這裡的內容，換新 PDF 也不會自動更新。要回到自動整理，按「清空手動內容，改回自動整理」。`,
    );
  };
  const clearManual = () => {
    if (!window.confirm("清空下方的每日行程與費用說明，行程頁改回顯示 PDF 自動整理的內容？（注意事項與常見問題不受影響）")) return;
    onChange({ itinerary: [], includes: "", excludes: "" });
    setPasteMessage("已清空。按「儲存並更新網站」後，行程頁就會改回顯示 PDF 自動整理的內容。");
  };

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
    <details
      className="field-wide trip-content-editor"
      onToggle={(event) => {
        if (event.currentTarget.open && pdfSource && pdf?.key !== pdfSource.pdfKey) void loadPdf(pdfSource.pdfKey);
      }}
    >
      <summary>
        <span>行程內容（每日行程、費用說明、常見問題）</span>
        <small>{filled.length ? `已填：${filled.join("・")}` : "選填・每日行程與費用說明會自動從上傳的 PDF 整理"}</small>
      </summary>

      <div className="trip-content-body">
        <p className="trip-content-intro">
          不用填也可以：上傳行程 PDF 後，系統會自動整理出每日行程、餐食、住宿與費用包含／不含，放在行程頁上。
          只有自動整理的內容有錯、想改寫，或要加常見問題時才需要填；這裡填了就以這裡為準。
        </p>

        <TripPdfPreview
          hasPdf={Boolean(pdfSource)}
          planLabel={pdfSource?.planLabel ?? ""}
          lookup={pdfLookup}
          manualDays={days.length}
          onRecheck={() => pdfSource && void loadPdf(pdfSource.pdfKey)}
          onCopy={copyFromPdf}
          onClear={clearManual}
        />
        {pasteMessage ? (
          <p className="trip-content-status" role="status">
            {pasteMessage}
          </p>
        ) : null}

        <h4>手動填寫每日行程</h4>
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
