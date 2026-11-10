"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { recordFinderEvent } from "@/lib/finder-events";
import type { Trip } from "@/lib/site-content";
import { basisLabels, destinationOptions, emptyNeeds, findTravel, needsSummary, relaxOptions, serviceLabels, validateNeeds, type TravelNeeds, type TravelCandidate } from "@/lib/travel-finder";
import { departureAirport, priceBasis } from "@/lib/travel-facts";
import { publishedTripPlans, tripPlanSummary } from "@/lib/trip-plans";
import { tripPath } from "@/lib/trip-values";
import { ContactForm } from "./ContactForm";
import { TravelImage } from "./TravelImage";

const services = [
  { id: "group", icon: "01", title: "跟著行程，輕鬆出發", text: "找一團喜歡的旅行，把安排交給我們。" },
  { id: "custom", icon: "02", title: "和自己人，玩自己的", text: "親友自組、公司出遊，一起規劃專屬旅程。" },
  { id: "partial", icon: "03", title: "只差一點，就能出發", text: "機票、機加酒或包車，補上需要的安排。" },
  { id: "undecided", icon: "04", title: "還沒想好，找找靈感", text: "先看看有哪些選擇，不用急著決定。" },
] as const;
const questions = ["這次，想怎麼旅行？", "心裡有想去的地方嗎？", "從哪裡、什麼時候出發？", "這趟旅行，想抓多少預算？", "和誰同行？還有什麼小心願？"];
const stepLabels = ["旅行方式", "想去的地方", "出發安排", "旅行預算", "同行與心願"];
// 一次列出幾張卡；把沒有團期的行程也納入後，不設限的結果會有上百個。
const pageSize = 12;
const firstPage = { dated: pageSize, open: pageSize };
const commonAirports = ["桃園", "松山", "台中", "高雄"];

function ChoiceCard({ candidate: c, departureId, selected, disabled, compact, onSelect, onDate }: {
  candidate: TravelCandidate; departureId: string; selected: boolean; disabled: boolean; compact?: boolean;
  onSelect: () => void; onDate: (id: string) => void;
}) {
  // 還沒公布團期的行程沒有出發日可選，卡片改成提示洽詢。
  const d = c.departures.find(d => d.id === departureId) || c.departures[0];
  const price = d?.price || c.plan.price || c.trip.price || "價格洽詢";
  const summary = tripPlanSummary(c.plan);
  return <article className={`finder-postcard${selected ? " is-picked" : ""}${compact ? " compact" : ""}`}>
    {!compact && <div className="finder-postcard-image">{c.trip.image ? <TravelImage src={c.trip.image} alt="" /> : <span aria-hidden="true">旅</span>}<span className="finder-stamp">{[c.trip.days, c.trip.region].filter(Boolean).join(" · ")}</span></div>}
    <div className="finder-postcard-body">
      <h3>{c.trip.title}</h3><p className="finder-airline">{[c.plan.airline, c.plan.title].filter(Boolean).join(" · ")}</p>
      <p className="finder-price">{price}<small>{basisLabels[priceBasis(c.plan, price)]}</small></p>
      {!compact && summary && <p>{summary}</p>}
      <dl className="finder-facts">{(departureAirport(c.plan) || c.plan.flight) && <div><dt>🛫 出發／航班</dt><dd>{[departureAirport(c.plan), c.plan.flight].filter(Boolean).join(" · ")}</dd></div>}<div><dt>🌙 住宿／天數</dt><dd>{[c.plan.accommodation, c.trip.days].filter(Boolean).join(" · ")}</dd></div></dl>
      {d ? <label className="field"><span>想選哪一天？</span><select aria-label={`${c.trip.title} ${c.plan.title}出發日${compact ? "（比較）" : ""}`} value={d.id} onChange={e => onDate(e.target.value)}>{c.departures.map(date => <option key={date.id} value={date.id}>{date.date} · {date.price || c.plan.price || c.trip.price}{priceBasis(c.plan, date.price || c.plan.price || c.trip.price) !== "unknown" ? `（${basisLabels[priceBasis(c.plan, date.price || c.plan.price || c.trip.price)]}）` : ""}</option>)}</select></label>
        : <p className="finder-note">團期尚未公布，出發日請顧問確認。{c.moreVersions > 0 && `另有 ${c.moreVersions} 個版本，可到行程頁比較。`}</p>}
      {d?.note && <p className="finder-note">團期備註：{d.note}</p>}
      {c.reasons.length > 0 && <p className="finder-match">{c.reasons.join(" · ")}</p>}
      {c.unconfirmed.length > 0 && <p className="finder-pending">還要確認：{c.unconfirmed.join("、")}</p>}
      <div className="finder-actions"><button type="button" className="button button-secondary" aria-pressed={selected} disabled={disabled} onClick={onSelect}>{selected ? "✓ 已收藏，點此移除" : "♡ 放進比較清單"}</button><Link className="button" href={`${tripPath(c.trip)}#plan-${encodeURIComponent(c.plan.id)}`}>查看行程 →</Link><a href={c.plan.documentUrl} target="_blank" rel="noreferrer">{c.plan.documentType === "pdf" ? "開啟行程 PDF ↗" : "開啟行程文件 ↗"}</a></div>
    </div>
  </article>;
}

export function TravelFinder({ trips, lineUrl, today }: { trips: Trip[]; lineUrl: string; today: number }) {
  const [needs, setNeeds] = useState<TravelNeeds>(emptyNeeds);
  const [step, setStep] = useState(0);
  const [stage, setStage] = useState<"needs" | "results" | "contact">("needs");
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [dates, setDates] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [shown, setShown] = useState(firstPage);
  const heading = useRef<HTMLHeadingElement>(null);
  const started = useRef(false);
  useEffect(() => { recordFinderEvent("view"); }, []);
  const customService = needs.service === "custom" || needs.service === "partial";
  const { dated, open } = useMemo(() => {
    const result = findTravel(trips, needs, today);
    return { dated: [...result.candidates, ...result.pendingCandidates], open: result.openCandidates };
  }, [trips, needs, today]);
  const allCandidates = [...dated, ...open];
  const selected = allCandidates.filter(c => c.key in chosen).map(candidate => ({ candidate, departureId: chosen[candidate.key] }));
  const summary = needsSummary(needs, selected);
  const relax = useMemo(() => dated.length + open.length ? [] : relaxOptions(trips, needs, today), [dated, open, trips, needs, today]);
  // 客製與單項服務沒有現成商品可配對，目的地只是交給顧問的方向，選項沿用全部行程的地區。
  const optionService = customService ? "undecided" : needs.service;
  const destinations = useMemo(() => destinationOptions(trips, optionService, today), [trips, optionService, today]);
  const activeGroup = destinations.find(o => o.group === needs.destination || o.regions.some(r => r.name === needs.destination));
  const subRegions = activeGroup?.regions.filter(r => r.name !== activeGroup.group) ?? [];
  // 出發地只列行程資料裡真的有的；客製服務不受現成行程限制，補上常見機場。
  const listed = [...new Set(trips.flatMap(t => publishedTripPlans(t).map(departureAirport).filter(Boolean)))];
  const airports = [...new Set([...commonAirports.filter(a => customService || !listed.length || listed.includes(a)), ...listed])];

  function focusHeading() { requestAnimationFrame(() => { heading.current?.focus(); heading.current?.scrollIntoView({ block: "nearest" }); }); }
  function change<K extends keyof TravelNeeds>(key: K, value: TravelNeeds[K]) {
    if (!started.current) { started.current = true; recordFinderEvent("start"); }
    setNeeds(n => ({ ...n, [key]: value })); setChosen({}); setDates({}); setShown(firstPage); setError("");
  }
  function relaxNeeds(patch: Partial<TravelNeeds>) {
    setNeeds(n => ({ ...n, ...patch })); setChosen({}); setDates({}); setShown(firstPage); setError(""); focusHeading();
  }
  function navigate(next: typeof stage) { setStage(next); setError(""); focusHeading(); }
  function goStep(next: number) { setStep(next); setError(""); focusHeading(); }
  function advance(event: FormEvent) {
    event.preventDefault();
    const partial = step === 2 ? { ...emptyNeeds, service: needs.service, start: needs.start, end: needs.end, returnDate: needs.returnDate } : step === 3 ? { ...emptyNeeds, budget: needs.budget } : step === 4 ? needs : emptyNeeds;
    const issue = validateNeeds(partial);
    if (issue) { setError(issue); return; }
    if (step < 4) { goStep(step + 1); return; }
    recordFinderEvent("complete"); if (!allCandidates.length) recordFinderEvent("no_results"); navigate("results");
  }
  function toggle(c: TravelCandidate) {
    setError("");
    setChosen(current => {
      const copy = { ...current };
      if (c.key in copy) delete copy[c.key];
      else if (Object.keys(copy).length < 3) copy[c.key] = dates[c.key] || c.departures[0]?.id || "";
      return copy;
    });
  }
  function card(c: TravelCandidate, compact = false) {
    return <ChoiceCard key={c.key} candidate={c} compact={compact} departureId={chosen[c.key] || dates[c.key] || c.departures[0]?.id || ""} selected={c.key in chosen} disabled={!(c.key in chosen) && selected.length >= 3} onSelect={() => toggle(c)} onDate={id => { setDates(current => ({ ...current, [c.key]: id })); if (c.key in chosen) setChosen(current => ({ ...current, [c.key]: id })); }} />;
  }
  function more(list: "dated" | "open", total: number) {
    const rest = total - shown[list];
    return rest > 0 && <button type="button" className="button button-secondary finder-more" onClick={() => setShown(current => ({ ...current, [list]: current[list] + pageSize }))}>再看 {Math.min(pageSize, rest)} 個（還有 {rest} 個）</button>;
  }
  return <div className="finder-panel finder-playful">
    <div className="finder-guide"><span className="finder-guide-icon" aria-hidden="true">↗</span><div><strong>一起找到，喜歡的旅行。</strong><small>{stage === "needs" ? "一次一個小問題，還沒想好也沒關係。" : "把喜歡的留下來，其他細節我們一起確認。"}</small></div></div>
    {stage === "needs" && <ol className="finder-progress" aria-label="需求進度">{stepLabels.map((label, i) => <li key={label} className={i === step ? "current" : i < step ? "done" : ""}><button type="button" disabled={i > step} aria-current={i === step ? "step" : undefined} onClick={() => goStep(i)}><span>{i < step ? "✓" : i + 1}</span>{label}</button></li>)}</ol>}
    <p className="finder-kicker">{stage === "needs" ? `小問題 ${step + 1} / 5` : stage === "results" ? "你的旅行靈感清單" : "最後一步，交給我們"}</p>
    <h2 ref={heading} tabIndex={-1}>{stage === "needs" ? questions[step] : stage === "results" ? "有沒有讓你心動的選擇？" : "把想法留給顧問，把期待留給旅行。"}</h2>
    {stage === "needs" && <form onSubmit={advance}>
      <div className="finder-question" key={step}>
        {step === 0 && <fieldset className="finder-services"><legend className="sr-only">旅行方式</legend><div className="finder-grid">{services.map(s => <label className={`finder-service ${needs.service === s.id ? "selected" : ""}`} key={s.id}><input type="radio" name="service" checked={needs.service === s.id} onChange={() => change("service", s.id)} /><span className="finder-service-icon" aria-hidden="true">{s.icon}</span><strong>{s.title}</strong><small>{s.text}</small><span className="finder-service-label">{serviceLabels[s.id]}</span></label>)}</div></fieldset>}
        {step === 1 && <><p>選個大方向就好，其他想去的地方也能在最後告訴我們。</p>
          <div className="finder-chips" role="group" aria-label="目的地"><button type="button" aria-pressed={!needs.destination} onClick={() => change("destination", "")}>還沒決定／其他地方</button>{destinations.map(o => <button key={o.group} type="button" aria-pressed={activeGroup?.group === o.group} onClick={() => change("destination", o.group)}>{o.group}{!customService && <small>{o.count}</small>}</button>)}</div>
          {activeGroup && subRegions.length > 1 && <div className="finder-chips finder-subchips" role="group" aria-label={`${activeGroup.group}的地區`}><button type="button" aria-pressed={needs.destination === activeGroup.group} onClick={() => change("destination", activeGroup.group)}>{activeGroup.group}都可以</button>{subRegions.map(r => <button key={r.name} type="button" aria-pressed={needs.destination === r.name} onClick={() => change("destination", r.name)}>{r.name}{!customService && <small>{r.count}</small>}</button>)}</div>}
          {!customService && destinations.length > 0 && <p className="finder-note">數字是目前可以參考的行程數。</p>}</>}
        {step === 2 && <div className="field-grid"><fieldset className="field finder-dates"><legend>可以出發的日期範圍</legend><label>最早<input aria-label="最早出發日" type="date" value={needs.start} onChange={e => change("start", e.target.value)} /></label><label>最晚<input aria-label="最晚出發日" type="date" min={needs.start || undefined} value={needs.end} onChange={e => change("end", e.target.value)} /></label><small>留空代表尚未決定。這是可出發的範圍，不是去回程日期。</small></fieldset><label className="field"><span>從哪裡出發？</span><select value={needs.airport} onChange={e => change("airport", e.target.value)}><option value="">都可以／還沒決定</option>{airports.map(a => <option key={a}>{a}</option>)}</select></label>{needs.service === "partial" && <label className="field"><span>回程日期（選填）</span><input type="date" min={needs.start || undefined} value={needs.returnDate} onChange={e => change("returnDate", e.target.value)} /></label>}</div>}
        {step === 3 && <><p>先抓每人的預算上限，實際費用再由顧問和你確認。</p><div className="finder-chips" role="group" aria-label="預算快捷選擇">{["", "30000", "50000", "80000"].map(b => <button key={b} type="button" aria-pressed={needs.budget === b} onClick={() => change("budget", b)}>{b ? `${Number(b).toLocaleString()} 元內` : "先不設限"}</button>)}</div><label className="field finder-budget"><span>或填寫自己的金額（台幣／人）</span><input type="number" min="1" step="1" value={needs.budget} placeholder="例如 45000" onChange={e => change("budget", e.target.value)} /></label><p className="finder-note">卡片顯示行程參考價格，完整費用請查看行程頁與文件。</p></>}
        {step === 4 && <div className="field-grid"><label className="field"><span>一起出發的人數</span><input type="number" min="1" max="999" step="1" value={needs.people} placeholder="尚未決定可留空" onChange={e => change("people", e.target.value)} /></label>{needs.service === "partial" && <label className="field"><span>行李需要怎麼安排？</span><select value={needs.luggage} onChange={e => change("luggage", e.target.value)}><option value="">還沒決定</option><option>僅手提行李</option><option>需要托運行李</option><option>有特殊行李，請顧問聯繫確認</option></select></label>}{needs.service === "custom" && <label className="field"><span>住宿與交通需求</span><input maxLength={200} value={needs.stayTransport} placeholder="例如：四星飯店、需要包車" onChange={e => change("stayTransport", e.target.value)} /></label>}<label className="field field-wide"><span>還有什麼想告訴我們？（選填）</span><textarea maxLength={600} value={needs.details} placeholder={needs.service === "partial" ? "想去哪個航點？需要機票、機加酒或包車？日期是否有彈性？" : "想去的地方、旅遊天數，或同行家人的需求，都可以寫在這裡。"} onChange={e => change("details", e.target.value)} /><small>這些小心願會完整交給顧問，由顧問協助確認。</small></label></div>}
      </div>
      {error && <p className="finder-error" role="alert">{error}</p>}
      <div className="finder-question-footer">{step > 0 ? <button type="button" className="button button-secondary" onClick={() => goStep(step - 1)}>← 上一題</button> : <span>不需登入，也不用先留電話</span>}<button className="button" type="submit">{step === 4 ? customService ? "整理我的旅行想法 →" : "看看我的旅行選擇 →" : "下一題 →"}</button></div>
    </form>}
    {stage === "results" && <>
      <div className="finder-recap"><span>{serviceLabels[needs.service]}</span><span>{needs.destination || "目的地不限"}</span><span>{needs.budget ? `每人 ${Number(needs.budget).toLocaleString()} 元內` : "預算未定"}</span>{(needs.start || needs.end) && <span>出發日 {needs.start || "不限"} ～ {needs.end || "不限"}</span>}{needs.airport && <span>{needs.airport}出發</span>}<button type="button" onClick={() => { goStep(0); navigate("needs"); }}>修改我的想法 ↺</button></div>
      <p>先看看符合的行程，收藏最多 3 個版本一起比較。團位、最終報價與同行者需求，再由顧問協助確認。</p>
      {!allCandidates.length && <div className="finder-empty"><span aria-hidden="true">🌱</span><h3>{customService ? "你的旅程，可以從想法開始。" : "這幾個條件放在一起，目前沒有行程。"}</h3><p>{customService ? "客製安排與單項服務需要依日期和人數確認，將需求交給顧問就好。" : relax.length ? "放寬其中一項就找得到，也可以不改條件，直接把原始需求交給顧問。" : "不用重新填寫，我們會把原始需求交給顧問。"}</p>{relax.length > 0 && <div className="finder-relax" role="group" aria-label="放寬條件">{relax.map(o => <button key={o.label} type="button" className="button button-secondary" onClick={() => relaxNeeds(o.patch)}>{o.label}<small>{o.count} 個行程</small></button>)}</div>}</div>}
      {dated.length > 0 && <div className="finder-results">{dated.slice(0, shown.dated).map(c => card(c))}</div>}
      {more("dated", dated.length)}
      {open.length > 0 && <section className="finder-open"><h3>{dated.length ? "還有" : "有"} {open.length} 個行程，團期洽詢</h3><p>這些行程還沒公布出發日。喜歡的話一樣可以收藏，日期與報價由顧問確認。</p><div className="finder-results">{open.slice(0, shown.open).map(c => card(c))}</div>{more("open", open.length)}</section>}
      {selected.length > 0 && <section className="finder-comparison"><p className="finder-kicker">MY TRAVEL SHORTLIST</p><h3>放在一起，看看更喜歡哪一個。</h3><p>已收藏 {selected.length} / 3。日期、航空、住宿和價格各自列在卡片上。不同價格基準不直接比高低。</p><div className="finder-shortlist">{selected.map(({ candidate }) => card(candidate, true))}</div></section>}
      <div className="finder-footer"><span>{selected.length ? `♡ 已收藏 ${selected.length} 個版本` : "還沒選到也沒關係，顧問可以幫忙。"}</span><button type="button" className="button" onClick={() => navigate("contact")}>帶著想法，找顧問聊聊 →</button></div>
    </>}
    <div hidden={stage !== "contact"}><button type="button" className="button button-secondary" onClick={() => navigate("results")}>← 返回我的清單</button><p>先確認以下旅行想法，再留下方便聯絡的方式。</p><ContactForm lineUrl={lineUrl} contextMessage={summary} initialMessage="請顧問依上述需求協助確認行程。" /></div>
  </div>;
}
