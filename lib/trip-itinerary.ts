// 每日行程與條列內容的共用工具；不 import 伺服器端模組，後台與前台都能用。

export type ParsedDay = { title: string; description: string; meals: string; hotel: string };

// 「第1天」「第 一 日」「Day 1」「DAY01」「D1」開頭的行視為新的一天。
const dayMarker =
  /^(?:第\s*[0-9０-９一二三四五六七八九十]+\s*[天日]|D(?:AY)?\s*[-.]?\s*\d{1,2})(?![0-9A-Za-z])\s*[:：.、\-—–)）]?\s*(.*)$/i;
const mealLine = /^(?:餐食|早餐|午餐|晚餐|早\s*[:：]|午\s*[:：]|晚\s*[:：])/;
const hotelLine = /^(?:住宿|宿泊|飯店|酒店|旅館)\s*[:：]?\s*/;

/**
 * 從 PDF 複製出來的整段行程拆成每日行程。第一個「第 N 天」之前的文字（標題、注意事項）略過；
 * 餐食與住宿行各自放進對應欄位，其餘依原順序當作當天說明。
 */
export function parseItineraryText(text: string): ParsedDay[] {
  const days: ParsedDay[] = [];
  let current: (ParsedDay & { lines: string[] }) | null = null;
  const finish = () => {
    if (!current) return;
    const lines = current.lines;
    const title = current.title || lines.shift() || "";
    days.push({ title, description: lines.join("\n"), meals: current.meals, hotel: current.hotel });
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    const marker = line.match(dayMarker);
    if (marker) {
      finish();
      current = { title: marker[1].trim(), description: "", meals: "", hotel: "", lines: [] };
      continue;
    }
    if (!current) continue;
    if (mealLine.test(line)) current.meals = current.meals ? `${current.meals}／${line}` : line;
    else if (hotelLine.test(line)) current.hotel = line.replace(hotelLine, "");
    else current.lines.push(line);
  }
  finish();
  return days.filter((day) => day.title || day.description);
}

/** 「每行一項」的文字轉成清單，去掉開頭的項目符號。 */
export function listLines(text: string | undefined) {
  return (text ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s•・·●○◎▪■□◆◇※*\-–—]+/u, "").trim())
    .filter(Boolean);
}
