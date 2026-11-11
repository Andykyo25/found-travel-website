/**
 * 業務系統「動態檔」的文字解析。
 *
 * 動態檔是業務手打的等寬文字報表：一個檔有多個地區（■****北海道****▆▆▆），
 * 每個地區底下有多個行程組（「點  燈：六天  定*  備註:」那一行開頭），再往下每一行是一個團。
 *
 * 這裡只取官網需要公開的欄位：出發日、售價、是否額滿／成團。
 * 報表裡的旅客姓名、利潤、票款、領隊等一律不讀、不回傳，連原始行也不保留。
 */

export type TourFeedStatus = "open" | "few" | "full" | "confirmed";

export type TourFeedDeparture = {
  /** 團號，例如 SPK6FD1130A6（「====」開頭的省略寫法已還原）。 */
  code: string;
  /** 出發機場代碼，例如 SPK。 */
  airport: string;
  /** 航空公司二字代碼，例如 FD。 */
  airline: string;
  /** YYYY/MM/DD */
  date: string;
  days: number;
  /** 每人售價（元）。報表的 359 代表 35,900。 */
  price: number;
  /** 價格旁的單字標記（超、跳、雪、巴…）或團號前的「特」：同一組裡的另一種等級。 */
  variant: string;
  /** 台中／高雄出發的團，團號前會標「中」「高」。 */
  from: "" | "中" | "高" | "松";
  status: TourFeedStatus;
};

export type TourFeedGroup = {
  /** 地區標題，例如「北海道」。 */
  region: string;
  /** 行程組名稱，例如「點燈」。 */
  label: string;
  /** 行程組標題寫的天數；沒寫時是 null。 */
  labelDays: number | null;
  /**
   * 這個地區開頭「●團型●」列出的所有行程名稱（特惠、超值、冰柱節…）。
   * 團號旁的單字標記就是這些名稱的簡寫，配對時用它還原。
   */
  regionProducts: string[];
  departures: TourFeedDeparture[];
};

const fullWidthToHalf = (text: string) =>
  text.replace(/[！-～]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 65248)).replace(/　/g, " ");

const chineseDigits: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

/** 「六天」「８天」「十二天」→ 6、8、12。 */
export function parseDayCount(text: string): number | null {
  const match = /([0-9]+|[一二三四五六七八九十]+)\s*[天日]/.exec(fullWidthToHalf(text));
  if (!match) return null;
  if (/^\d+$/.test(match[1])) return Number(match[1]);
  const word = match[1];
  if (word.length === 1) return chineseDigits[word] ?? null;
  if (word.startsWith("十")) return 10 + (chineseDigits[word[1]] ?? 0);
  if (word.endsWith("十")) return (chineseDigits[word[0]] ?? 0) * 10;
  return null;
}

const sectionPattern = /^■\**(.+?)▆+/;
const groupHeaderPattern = /^[\s"■˙◎]*(.{2,14}?)\s*定[*:]/;

function parseGroupHeader(line: string): { label: string; days: number | null } | null {
  if (!line.includes("備註")) return null;
  const half = fullWidthToHalf(line);
  const match = groupHeaderPattern.exec(half);
  if (!match) return null;
  const raw = match[1].replace(/[\s"■]/g, "");
  if (!raw) return null;
  const colon = raw.indexOf(":");
  const name = (colon === -1 ? raw.replace(/[0-9]{1,2}天$/, "") : raw.slice(0, colon)).replace(/[=(].*$/, "");
  return name ? { label: name, days: parseDayCount(raw) } : null;
}

// 地區開頭的行程一覽：「˙冰柱節：五天  199-(10.20)=43…」。只取名稱，後面的價格與利潤不讀。
const overviewPattern = /^[\s"˙◎■]*([^\s:\-][^:]{0,9}?)\s*:\s*(?:[0-9]{1,2}|[一二三四五六七八九十]{1,3})\s*天/;

function parseOverviewName(line: string): string | null {
  const match = overviewPattern.exec(fullWidthToHalf(line));
  if (!match) return null;
  const name = match[1].replace(/[\s"]/g, "");
  return name && !/^-+$/.test(name) ? name : null;
}

// 團號：機場 3 碼 + 年份末碼 + 航空 2 碼 + 月日 4 碼 + 車次字母 + 天數末碼。
// 同一組連續的團常把前 4 碼寫成「====」。
const tourLinePattern =
  /^(.{0,10}?)([A-Z]{3}\d|={4})([A-Z0-9]{2})(\d{4})([A-Z])(\d)\s*([^\s\d+\-(]?)\s*(\d{3,4})([^\s\d+\-(]?)/;

function resolveYear(lastDigit: number, today: Date) {
  const base = today.getFullYear();
  for (let year = base - 1; year < base + 9; year += 1) if (year % 10 === lastDigit) return year;
  return base;
}

function resolveDays(digit: number, labelDays: number | null) {
  if (labelDays !== null && labelDays % 10 === digit) return labelDays;
  return digit === 0 ? 10 : digit;
}

/** 餘位欄在備註「)」之後、人數欄開頭的全形「１」之前，例如「＝30----  14  １…」。 */
function parseRemaining(rest: string): { remaining: number | null; full: boolean; waitlist: boolean } {
  const close = rest.indexOf(")");
  if (close === -1) return { remaining: null, full: false, waitlist: false };
  const match = /^([^１]*?)\s+(--|\d{1,3})\s+１/.exec(rest.slice(close + 1));
  if (!match) return { remaining: null, full: false, waitlist: false };
  const waitlist = /R\s*$/.test(match[1]);
  if (match[2] === "--") return { remaining: 0, full: true, waitlist };
  return { remaining: Number(match[2]), full: false, waitlist };
}

/** 剩這個人數以下就標「即將額滿」。精確人數不對外公開。 */
export const fewSeatsThreshold = 6;

function statusOf(rest: string): TourFeedStatus {
  const { remaining, full, waitlist } = parseRemaining(rest);
  if (full || remaining === 0) return "full";
  // 「R」是候補中的註記：位子已被訂滿，剩下的數字是候補名額。
  if (waitlist) return "full";
  const marker = rest.indexOf("●");
  if (marker !== -1 && rest.slice(marker).includes("出團")) return remaining !== null && remaining <= fewSeatsThreshold ? "few" : "confirmed";
  if (remaining !== null && remaining <= fewSeatsThreshold) return "few";
  return "open";
}

export function parseTourFeed(text: string, today = new Date()): TourFeedGroup[] {
  const groups: TourFeedGroup[] = [];
  let region = "";
  let group: TourFeedGroup | null = null;
  let lastPrefix = "";
  let products: string[] = [];

  for (const line of text.split(/\r?\n/)) {
    const section = sectionPattern.exec(line);
    if (section) {
      region = section[1].replace(/\*+$/, "").replace(/[\s　]/g, "");
      group = null;
      lastPrefix = "";
      products = [];
      continue;
    }
    const header = parseGroupHeader(line);
    if (header) {
      if (!products.includes(header.label)) products.push(header.label);
      group = { region, label: header.label, labelDays: header.days, regionProducts: products, departures: [] };
      groups.push(group);
      continue;
    }

    const match = tourLinePattern.exec(line);
    if (!match) {
      const name = parseOverviewName(line);
      if (name && !products.includes(name)) products.push(name);
      continue;
    }
    if (!group) continue;
    const [whole, lead, head, airline, monthDay, , dayDigit, before, priceText, after] = match;
    const prefix = head.startsWith("=") ? lastPrefix : head;
    if (!prefix) continue;
    if (!head.startsWith("=")) lastPrefix = head;

    const month = Number(monthDay.slice(0, 2));
    const day = Number(monthDay.slice(2));
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;
    const year = resolveYear(Number(prefix[3]), today);
    const leadText = fullWidthToHalf(lead).replace(/[\s"'*\d]/g, "");
    const from = (/[中高松]/.exec(leadText)?.[0] ?? "") as TourFeedDeparture["from"];
    const leadVariant = leadText.replace(/[中高松]/g, "").slice(0, 1);

    group.departures.push({
      code: `${prefix}${airline}${monthDay}${match[5]}${dayDigit}`,
      airport: prefix.slice(0, 3),
      airline,
      date: `${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`,
      days: resolveDays(Number(dayDigit), group.labelDays),
      price: Number(priceText) * 100,
      variant: before || after || leadVariant,
      from,
      status: statusOf(line.slice(whole.length)),
    });
  }
  return groups.filter((item) => item.departures.length > 0);
}
