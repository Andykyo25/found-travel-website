"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { recordFinderEvent } from "@/lib/finder-events";
import type { Trip } from "@/lib/site-content";
import { basisLabels, emptyNeeds, findTravel, needsSummary, serviceLabels, validateNeeds, type TravelNeeds, type TravelCandidate } from "@/lib/travel-finder";
import { departureAirport, priceBasis } from "@/lib/travel-facts";
import { ContactForm } from "./ContactForm";
import { TravelImage } from "./TravelImage";

const services = [
  { id: "group", icon: "🧳", title: "跟著行程，輕鬆出發", text: "找一團喜歡的旅行，把安排交給我們。" },
  { id: "custom", icon: "🚌", title: "和自己人，玩自己的", text: "親友自組、公司出遊，一起規劃專屬旅程。" },
  { id: "partial", icon: "✈️", title: "只差一點，就能出發", text: "機票、機加酒或包車，補上需要的安排。" },
  { id: "undecided", icon: "🧭", title: "還沒想好，找找靈感", text: "先看看有哪些選擇，不用急著決定。" },
] as const;
const questions = ["這次，想怎麼旅行？", "心裡有想去的地方嗎？", "從哪裡、什麼時候出發？", "這趟旅行，想抓多少預算？", "和誰同行？還有什麼小心願？"];
const stepLabels = ["旅行方式", "想去的地方", "出發安排", "旅行預算", "同行與心願"];

function ChoiceCard({ candidate: c, departureId, selected, disabled, compact, onSelect, onDate }: {
  candidate: TravelCandidate; departureId: string; selected: boolean; disabled: boolean; compact?: boolean;
  onSelect: () => void; onDate: (id: string) => void;
}) {
  const d = c.departures.find(d => d.id === departureId) || c.departures[0];
  const price = d.price || c.plan.price || c.trip.price || "價格待確認";
  return <article className={`finder-postcard${selected ? " is-picked" : ""}${compact ? " compact" : ""}`}>
    {!compact && <div className="finder-postcard-image">{c.trip.image ? <TravelImage src={c.trip.image} alt="" /> : <span aria-hidden="true">🧳</span>}<span className="finder-stamp">{c.trip.days} · {c.trip.region}</span></div>}
    <div className="finder-postcard-body">
      <span className={`finder-badge${c.needsConfirmation ? " pending" : ""}`}>{c.needsConfirmation ? "有條件待確認" : "符合已知條件"}</span>
      <h3>{c.trip.title}</h3><p className="finder-airline">{c.plan.airline} · {c.plan.title}</p>
      <p className="finder-price">{price}<small>{basisLabels[priceBasis(c.plan, price)]}</small></p>
      {!compact && <p>{c.plan.summary}</p>}
      <dl className="finder-facts"><div><dt>🛫 出發／航班</dt><dd>{departureAirport(c.plan) || "待確認"} · {c.plan.flight || "航班待確認"}</dd></div><div><dt>🌙 住宿／天數</dt><dd>{c.plan.accommodation || "住宿待確認"} · {c.trip.days}</dd></div></dl>
      <label className="field"><span>想選哪一天？</span><select aria-label={`${c.trip.title} ${c.plan.title}出發日${compact ? "（比較）" : ""}`} value={d.id} onChange={e => onDate(e.target.value)}>{c.departures.map(date => <option key={date.id} value={date.id}>{date.date} · {date.price || c.plan.price || c.trip.price}（{basisLabels[priceBasis(c.plan, date.price || c.plan.price || c.trip.price)]}）</option>)}</select></label>
      {d.note && <p className="finder-note">團期備註：{d.note}</p>}
      <p className="finder-match">{c.reasons.join(" · ")}</p>
      <details className="finder-card-details"><summary>出發前一起確認的事</summary><ul>{c.pending.map(p => <li key={p}>{p}</li>)}</ul>{c.plan.documentUpdatedAt && <p>文件內容確認：{c.plan.documentUpdatedAt}</p>}</details>
      <div className="finder-actions"><button type="button" className="button button-secondary" aria-pressed={selected} disabled={disabled} onClick={onSelect}>{selected ? "✓ 已收藏，點此移除" : "♡ 放進比較清單"}</button><a href={c.plan.documentUrl} target="_blank" rel="noreferrer">看完整行程 ↗</a></div>
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
  const heading = useRef<HTMLHeadingElement>(null);
  const started = useRef(false);
  useEffect(() => { recordFinderEvent("view"); }, []);
  const { candidates, pendingCandidates } = findTravel(trips, needs, today);
  const allCandidates = [...candidates, ...pendingCandidates];
  const selected = allCandidates.filter(c => c.key in chosen).map(candidate => ({ candidate, departureId: chosen[candidate.key] }));
  const summary = needsSummary(needs, selected);
  const destinations = [...new Set(trips.map(t => t.region))];
  const airports = [...new Set(["桃園", "松山", "台中", "高雄", ...trips.flatMap(t => t.plans.map(departureAirport).filter(Boolean))])];

  function focusHeading() { requestAnimationFrame(() => { heading.current?.focus(); heading.current?.scrollIntoView({ block: "nearest" }); }); }
  function change<K extends keyof TravelNeeds>(key: K, value: TravelNeeds[K]) {
    if (!started.current) { started.current = true; recordFinderEvent("start"); }
    setNeeds(n => ({ ...n, [key]: value })); setChosen({}); setDates({}); setError("");
  }
  function navigate(next: typeof stage) { setStage(next); setError(""); focusHeading(); }
  function goStep(next: number) { setStep(next); setError(""); focusHeading(); }
  function advance(event: FormEvent) {
    event.preventDefault();
    const partial = step === 2 ? { ...emptyNeeds, service: needs.service, start: needs.start, end: needs.end, returnDate: needs.returnDate } : step === 3 ? { ...emptyNeeds, budget: needs.budget } : step === 4 ? needs : emptyNeeds;
    const issue = validateNeeds(partial);
    if (issue) { setError(issue); return; }
    if (step < 4) { goStep(step + 1); return; }
    recordFinderEvent("complete"); if (!candidates.length) recordFinderEvent("no_results"); navigate("results");
  }
  function toggle(c: TravelCandidate) {
    setError("");
    setChosen(current => {
      const copy = { ...current };
      if (c.key in copy) delete copy[c.key];
      else if (Object.keys(copy).length < 3) copy[c.key] = dates[c.key] || c.departures[0].id;
      return copy;
    });
  }
  function card(c: TravelCandidate, compact = false) {
    return <ChoiceCard key={c.key} candidate={c} compact={compact} departureId={chosen[c.key] || dates[c.key] || c.departures[0].id} selected={c.key in chosen} disabled={!(c.key in chosen) && selected.length >= 3} onSelect={() => toggle(c)} onDate={id => { setDates(current => ({ ...current, [c.key]: id })); if (c.key in chosen) setChosen(current => ({ ...current, [c.key]: id })); }} />;
  }
  const customService = needs.service === "custom" || needs.service === "partial";
  return <div className="finder-panel finder-playful">
    <div className="finder-guide"><span className="finder-guide-icon" aria-hidden="true">🧭</span><div><strong>一起找到，喜歡的旅行。</strong><small>{stage === "needs" ? "一次一個小問題，還沒想好也沒關係。" : "把喜歡的留下來，其他細節我們一起確認。"}</small></div></div>
    {stage === "needs" && <ol className="finder-progress" aria-label="需求進度">{stepLabels.map((label, i) => <li key={label} className={i === step ? "current" : i < step ? "done" : ""}><button type="button" disabled={i > step} aria-current={i === step ? "step" : undefined} onClick={() => goStep(i)}><span>{i < step ? "✓" : i + 1}</span>{label}</button></li>)}</ol>}
    <p className="finder-kicker">{stage === "needs" ? `小問題 ${step + 1} / 5` : stage === "results" ? "你的旅行靈感清單" : "最後一步，交給我們"}</p>
    <h2 ref={heading} tabIndex={-1}>{stage === "needs" ? questions[step] : stage === "results" ? "有沒有讓你心動的選擇？" : "把想法留給顧問，把期待留給旅行。"}</h2>
    {stage === "needs" && <form onSubmit={advance}>
      <div className="finder-question" key={step}>
        {step === 0 && <fieldset className="finder-services"><legend className="sr-only">旅行方式</legend><div className="finder-grid">{services.map(s => <label className={`finder-service ${needs.service === s.id ? "selected" : ""}`} key={s.id}><input type="radio" name="service" checked={needs.service === s.id} onChange={() => change("service", s.id)} /><span className="finder-service-icon" aria-hidden="true">{s.icon}</span><strong>{s.title}</strong><small>{s.text}</small><span className="finder-service-label">{serviceLabels[s.id]}</span></label>)}</div></fieldset>}
        {step === 1 && <><p>選個方向就好，其他想去的地方也能在最後告訴我們。</p><div className="finder-chips" role="group" aria-label="目的地">{["", ...destinations].map(d => <button key={d} type="button" aria-pressed={needs.destination === d} onClick={() => change("destination", d)}>{d || "🧭 還沒決定／其他地方"}</button>)}</div></>}
        {step === 2 && <div className="field-grid"><fieldset className="field finder-dates"><legend>可以出發的日期範圍</legend><label>最早<input aria-label="最早出發日" type="date" value={needs.start} onChange={e => change("start", e.target.value)} /></label><label>最晚<input aria-label="最晚出發日" type="date" min={needs.start || undefined} value={needs.end} onChange={e => change("end", e.target.value)} /></label><small>留空代表尚未決定。這是可出發的範圍，不是去回程日期。</small></fieldset><label className="field"><span>從哪個機場出發？</span><select value={needs.airport} onChange={e => change("airport", e.target.value)}><option value="">都可以／還沒決定</option>{airports.map(a => <option key={a}>{a}</option>)}</select></label>{needs.service === "partial" && <label className="field"><span>回程日期（選填）</span><input type="date" min={needs.start || undefined} value={needs.returnDate} onChange={e => change("returnDate", e.target.value)} /></label>}</div>}
        {step === 3 && <><p>先抓每人的預算上限，實際費用再由顧問和你確認。</p><div className="finder-chips" role="group" aria-label="預算快捷選擇">{["", "30000", "50000", "80000"].map(b => <button key={b} type="button" aria-pressed={needs.budget === b} onClick={() => change("budget", b)}>{b ? `${Number(b).toLocaleString()} 元內` : "先不設限"}</button>)}</div><label className="field finder-budget"><span>或填寫自己的金額（台幣／人）</span><input type="number" min="1" step="1" value={needs.budget} placeholder="例如 45000" onChange={e => change("budget", e.target.value)} /></label><p className="finder-note">起價或價格基準不明的版本，會另外標示待確認，不會當成已符合預算。</p></>}
        {step === 4 && <div className="field-grid"><label className="field"><span>一起出發的人數</span><input type="number" min="1" max="999" step="1" value={needs.people} placeholder="尚未決定可留空" onChange={e => change("people", e.target.value)} /></label>{needs.service === "partial" && <label className="field"><span>行李需要怎麼安排？</span><select value={needs.luggage} onChange={e => change("luggage", e.target.value)}><option value="">還沒決定</option><option>僅手提行李</option><option>需要托運行李</option><option>有特殊行李，請顧問聯繫確認</option></select></label>}{needs.service === "custom" && <label className="field"><span>住宿與交通需求</span><input maxLength={200} value={needs.stayTransport} placeholder="例如：四星飯店、需要包車" onChange={e => change("stayTransport", e.target.value)} /></label>}<label className="field field-wide"><span>還有什麼想告訴我們？（選填）</span><textarea maxLength={600} value={needs.details} placeholder={needs.service === "partial" ? "想去哪個航點？需要機票、機加酒或包車？日期是否有彈性？" : "想去的地方、旅遊天數，或同行家人的需求，都可以寫在這裡。"} onChange={e => change("details", e.target.value)} /><small>這些小心願會完整交給顧問，由顧問協助確認。</small></label></div>}
      </div>
      {error && <p className="finder-error" role="alert">{error}</p>}
      <div className="finder-question-footer">{step > 0 ? <button type="button" className="button button-secondary" onClick={() => goStep(step - 1)}>← 上一題</button> : <span>不需登入，也不用先留電話</span>}<button className="button" type="submit">{step === 4 ? customService ? "整理我的旅行想法 →" : "看看我的旅行選擇 →" : "下一題 →"}</button></div>
    </form>}
    {stage === "results" && <>
      <div className="finder-recap"><span>{serviceLabels[needs.service]}</span><span>{needs.destination || "目的地不限"}</span><span>{needs.budget ? `每人 ${Number(needs.budget).toLocaleString()} 元內` : "預算未定"}</span><button type="button" onClick={() => { goStep(0); navigate("needs"); }}>修改我的想法 ↺</button></div>
      <p>先看看已公布的行程，收藏最多 3 個版本一起比較。團位、最終報價與同行者需求，再由顧問協助確認。</p>
      {!candidates.length && <div className="finder-empty"><span aria-hidden="true">🌱</span><h3>{customService ? "你的旅程，可以從想法開始。" : "暫時沒有能確認符合全部條件的版本。"}</h3><p>{customService ? "客製安排與單項服務需要依日期和人數確認，將需求交給顧問就好。" : "不用重新填寫，也不必勉強改條件。我們會把原始需求交給顧問。"}</p></div>}
      <div className="finder-results">{candidates.map(c => card(c))}</div>
      {pendingCandidates.length > 0 && <details className="finder-maybe"><summary>🔎 還有 {pendingCandidates.length} 個版本，部分條件待確認</summary><p>這些版本尚不能確認符合全部需求；沒有放寬你的條件。可以先看看，感興趣的再請顧問確認。</p><div className="finder-results">{pendingCandidates.map(c => card(c))}</div></details>}
      {selected.length > 0 && <section className="finder-comparison"><p className="finder-kicker">MY TRAVEL SHORTLIST</p><h3>放在一起，看看更喜歡哪一個。</h3><p>已收藏 {selected.length} / 3。日期、航空、住宿和價格各自列在卡片上；不同價格基準不直接比高低。</p><div className="finder-shortlist">{selected.map(({ candidate }) => card(candidate, true))}</div></section>}
      <div className="finder-footer"><span>{selected.length ? `♡ 已收藏 ${selected.length} 個版本` : "還沒選到也沒關係，顧問可以幫忙。"}</span><button type="button" className="button" onClick={() => navigate("contact")}>帶著想法，找顧問聊聊 →</button></div>
    </>}
    <div hidden={stage !== "contact"}><button type="button" className="button button-secondary" onClick={() => navigate("results")}>← 返回我的清單</button><p>先確認以下旅行想法，再留下方便聯絡的方式。</p><ContactForm lineUrl={lineUrl} contextMessage={summary} initialMessage="請顧問依上述需求協助確認行程。" /></div>
  </div>;
}
