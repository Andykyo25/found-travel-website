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

// ---------------------------------------------------------------------------
// 國旅檔：欄位比國外線少（沒有備註與機位），價格直接是元（1599 就是 1,599 元）。
// 「看日出：二天  定價  位  餘  人數:」底下每列是「團號  定價  位  餘  …」。
// ---------------------------------------------------------------------------
const domesticHeaderPattern = /^[\s"■˙◎]*(.{2,14}?)\s*定價\s+位\s+餘/;
const domesticLinePattern = /^(.{0,10}?)([A-Z]{3}\d|={4})([A-Z0-9]{2})(\d{4})([A-Z])(\d)\s+(\d{3,6})\s+\d{1,3}\s+(--|\d{1,3})(?=\s|$)/;

export function parseDomesticFeed(text: string, today = new Date()): TourFeedGroup[] {
  const groups: TourFeedGroup[] = [];
  let region = "";
  let group: TourFeedGroup | null = null;
  let lastPrefix = "";
  for (const line of text.split(/\r?\n/)) {
    const section = sectionPattern.exec(line);
    if (section) {
      // 國旅檔的區段標題是「團體出發」之類的分類，不是地名；地區一律記成台灣。
      region = "台灣";
      group = null;
      lastPrefix = "";
      continue;
    }
    const header = domesticHeaderPattern.exec(fullWidthToHalf(line));
    if (header) {
      const raw = header[1].replace(/[\s"■]/g, "");
      const label = raw.split(":")[0];
      if (!label) continue;
      group = { region, label, labelDays: parseDayCount(raw), regionProducts: [], departures: [] };
      groups.push(group);
      continue;
    }
    if (!group) continue;
    const match = domesticLinePattern.exec(line);
    if (!match) continue;
    const [, lead, head, airline, monthDay, letter, dayDigit, priceText, left] = match;
    const prefix = head.startsWith("=") ? lastPrefix : head;
    if (!prefix) continue;
    if (!head.startsWith("=")) lastPrefix = head;
    const month = Number(monthDay.slice(0, 2));
    const day = Number(monthDay.slice(2));
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;
    const remaining = left === "--" ? 0 : Number(left);
    group.departures.push({
      code: `${prefix}${airline}${monthDay}${letter}${dayDigit}`,
      airport: prefix.slice(0, 3),
      // 國旅是遊覽車團，團號這兩碼不是航空公司。
      airline: "",
      date: `${resolveYear(Number(prefix[3]), today)}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`,
      days: resolveDays(Number(dayDigit), group.labelDays),
      price: Number(priceText),
      variant: "",
      from: (/[中高]/.exec(fullWidthToHalf(lead))?.[0] ?? "") as TourFeedDeparture["from"],
      status: remaining === 0 ? "full" : remaining <= fewSeatsThreshold ? "few" : "open",
    });
  }
  return groups.filter((item) => item.departures.length > 0);
}

// ---------------------------------------------------------------------------
// 郵輪檔：每個航次一個框，框頭寫「１１／２５ ＝宮古／沖繩／石垣島：自主遊５天」，
// 框下面各艙等一列「KLU6MS1125A5  219-30  兩人房：…●完售」。
// 一個航次只算一個出發日：售價取還沒完售的艙等裡最低的每人定價（219 = 21,900 元），
// 所有艙等都完售才算額滿。「-30」是同業折讓，不讀。
// ---------------------------------------------------------------------------
const sailingHeaderPattern = /^\s*[│|]\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*=\s*(.+?)\s*:\s*.*?(\d{1,2})\s*天/;
const cabinLinePattern = /^\s*([A-Z]{3})(\d)([A-Z0-9]{2})(\d{4})([A-Z])(\d)\s+(\d{2,4})\s*-/;

export function parseCruiseFeed(text: string, today = new Date()): TourFeedGroup[] {
  const groups = new Map<string, TourFeedGroup>();
  let region = "";
  let sailing: { name: string; days: number; monthDay: string } | null = null;
  let current: { departure: TourFeedDeparture; open: number[]; all: number[] } | null = null;

  const close = () => {
    if (!current) return;
    const { departure, open, all } = current;
    departure.price = Math.min(...(open.length > 0 ? open : all)) * 100;
    departure.status = open.length > 0 ? "open" : "full";
    current = null;
  };

  for (const line of text.split(/\r?\n/)) {
    const section = /^■+\**([^▆*■]+?)\**▆+/.exec(line);
    if (section) {
      region = section[1].replace(/[*\s　]/g, "");
      continue;
    }
    const header = sailingHeaderPattern.exec(fullWidthToHalf(line));
    if (header) {
      close();
      const name = header[3].replace(/自主遊$/, "").replace(/\s/g, "");
      sailing = name ? { name, days: Number(header[4]), monthDay: `${header[1].padStart(2, "0")}${header[2].padStart(2, "0")}` } : null;
      continue;
    }
    if (!sailing) continue;
    const cabin = cabinLinePattern.exec(line);
    if (!cabin || cabin[4] !== sailing.monthDay) continue;
    const [, port, yearDigit, ship, monthDay, , , priceText] = cabin;
    if (!current) {
      const key = `${region}|${sailing.name}|${sailing.days}`;
      const group = groups.get(key) ?? { region, label: sailing.name, labelDays: sailing.days, regionProducts: [], departures: [] };
      groups.set(key, group);
      const departure: TourFeedDeparture = {
        code: `${port}${yearDigit}${ship}${monthDay}X${sailing.days % 10}`,
        airport: port,
        airline: "",
        date: `${resolveYear(Number(yearDigit), today)}/${monthDay.slice(0, 2)}/${monthDay.slice(2)}`,
        days: sailing.days,
        price: 0,
        variant: "",
        from: "",
        status: "open",
      };
      group.departures.push(departure);
      current = { departure, open: [], all: [] };
    }
    const price = Number(priceText);
    current.all.push(price);
    if (!line.includes("完售")) current.open.push(price);
  }
  close();
  return [...groups.values()].filter((group) => group.departures.length > 0);
}

/** 依動態檔的名稱選解析方式：國旅、郵輪的排版和國外團體線不同。 */
export function parseFeedFile(name: string, text: string, today = new Date()): TourFeedGroup[] {
  const plain = fullWidthToHalf(name).replace(/\s/g, "");
  if (/國旅/.test(plain)) return parseDomesticFeed(text, today);
  if (/MSC|麗星|郵輪/.test(plain)) return parseCruiseFeed(text, today);
  return parseTourFeed(text, today);
}
