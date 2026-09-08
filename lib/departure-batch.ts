import type { Trip, TripDeparture } from "./site-content";
import { departuresForPlan } from "./trip-plans";
import { formatDepartureDate, parseDepartureDate } from "./trip-values";

export type DepartureBatchRow = Pick<TripDeparture, "date" | "price" | "note">;
export const departureBatchLimit = 366;

// Excel copies cells as TSV, quoting cells containing tabs, newlines or quotes.
export function parseDeparturePaste(text: string): DepartureBatchRow[] {
  if (text.length > 200_000) throw new Error("資料過多，請分批貼上，每批最多 366 個團期。");
  const records: string[][] = [];
  let record: string[] = [], cell = "", quoted = false;
  const source = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') {
      if (quoted && source[i + 1] === '"') { cell += '"'; i++; }
      else if (quoted || cell.length === 0) quoted = !quoted;
      else cell += char;
    } else if (!quoted && (char === "\t" || char === "\n")) {
      record.push(cell); cell = "";
      if (char === "\n") { records.push(record); record = []; }
    } else cell += char;
  }
  if (quoted) throw new Error("貼上的儲存格引號未閉合，請重新從 Excel 複製完整資料。");
  record.push(cell); records.push(record);
  const rows = records.filter(row => row.some(value => value.trim()));
  if (/^(出發日期|日期|date)$/i.test(rows[0]?.[0].trim() ?? "")) rows.shift();
  if (rows.length > departureBatchLimit) throw new Error("每批最多 366 個團期，請分批加入。");
  if (rows.some(row => row.length > 3)) throw new Error("請只複製「日期、價格、備註」三欄，欄位之間使用 Tab 分隔。");
  return rows.map(([date, price = "", note = ""]) => ({ date: date.trim(), price: price.trim(), note: note.trim() }));
}

export function validateDepartureBatch(trip: Trip, planId: string, rows: DepartureBatchRow[]) {
  const plan = trip.plans.find(p => p.id === planId);
  const error = !plan ? "此版本已不存在，請重新選擇。"
    : !rows.length ? "請至少加入一個日期。"
    : rows.length > departureBatchLimit ? "每批最多 366 個團期，請分批加入。" : null;
  const existing = new Set(plan ? departuresForPlan(trip.departures, plan).map(d => parseDepartureDate(d.date)?.time) : []);
  const counts = new Map<number, number>();
  rows.forEach(row => { const date = parseDepartureDate(row.date); if (date) counts.set(date.time, (counts.get(date.time) ?? 0) + 1); });
  const normalized: DepartureBatchRow[] = [];
  const issues = rows.map(row => {
    const messages: string[] = [];
    const date = parseDepartureDate(row.date);
    if (!date) messages.push("日期無效，請填 YYYY/MM/DD");
    else if (existing.has(date.time)) messages.push("此版本已有同日團期，請至出發日期表修改既有資料");
    else if ((counts.get(date.time) ?? 0) > 1) messages.push("這批資料有重複日期，請移除多餘列");
    const priceText = row.price.trim().replace(/^(NT\$|TWD|\$)\s*/i, "");
    const price = Number(priceText.replaceAll(",", ""));
    if (!/^(\d+|\d{1,3}(,\d{3})+)$/.test(priceText) || !Number.isSafeInteger(price) || price <= 0) messages.push("請填有效的正整數價格");
    if ((row.note?.length ?? 0) > 120) messages.push("備註最多 120 字");
    normalized.push({ date: date ? formatDepartureDate(row.date) : row.date, price: price.toLocaleString("en-US"), note: row.note?.trim() ?? "" });
    return messages.join("；");
  });
  return { error, issues, rows: normalized, valid: !error && issues.every(issue => !issue) };
}

export function addDepartureBatch(trip: Trip, planId: string, rows: DepartureBatchRow[], createId: () => string): Trip {
  const result = validateDepartureBatch(trip, planId, rows);
  if (!result.valid) throw new Error(result.error || result.issues.find(Boolean) || "團期資料無效");
  const additions = result.rows.map(row => ({ ...row, id: createId() }));
  const ids = new Set(trip.departures.map(d => d.id));
  for (const row of additions) {
    if (!row.id || ids.has(row.id)) throw new Error("團期識別碼重複，請重新加入。");
    ids.add(row.id);
  }
  // Snapshot each existing relationship before adding version-specific dates.
  // This prevents an existing 'all' plan from inheriting another airline's batch.
  return {
    ...trip,
    departures: [...trip.departures, ...additions],
    plans: trip.plans.map(plan => ({
      ...plan,
      departureMode: "selected",
      departureIds: [
        ...departuresForPlan(trip.departures, plan).map(d => d.id),
        ...(plan.id === planId ? additions.map(d => d.id) : []),
      ],
    })),
  };
}
