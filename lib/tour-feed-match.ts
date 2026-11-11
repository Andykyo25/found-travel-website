/**
 * 把業務系統動態檔的團期，對到官網的行程。
 *
 * 兩邊沒有共同的代碼，只能靠「地區 + 行程名稱 + 天數 + 航空」推斷：
 * 1. 動態檔的一個「商品」＝ 同檔、同地區、同行程名稱、同天數的所有團（不分航空與出發地）。
 * 2. 團號旁的單字標記（超、柱、雪…）是該地區另一個行程名稱的簡寫，先還原。
 * 3. 每個官網行程挑分數最高的商品；證據不足或有兩個一樣像的，就交給人確認，不自動套用。
 */
import type { TourFeedDeparture, TourFeedGroup } from "./tour-feed-parse";

export type FeedProduct = {
  /** 穩定的識別字串：檔名｜地區｜名稱｜天數。人工指定對應時存這個。 */
  key: string;
  file: string;
  /** 去掉出發地與航空註記的地區，例如「高／大阪＝AK」→「大阪」。 */
  region: string;
  /** 行程名稱，例如「冰柱節」；標記還原不了時是「組名+標記」，例如「精彩·豪」。 */
  name: string;
  /** 還原不了的單字標記；有值時 name 不是完整名稱。 */
  marker: string;
  days: number;
  departures: TourFeedDeparture[];
};

export type SiteTripForMatch = {
  id: string;
  title: string;
  region: string;
  days: string;
  price: string;
  plans: { airline: string; title: string }[];
  departures: { date: string; price: string }[];
};

export type TripMatch = {
  tripId: string;
  /** auto：可直接套用；review：有候選但需要人確認；none：動態檔裡目前沒有像的。 */
  status: "auto" | "review" | "none";
  candidates: { key: string; score: number; reasons: string[] }[];
};

const numerals: Record<string, number> = { 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

/** 這些是等級用語，每個地區都有，單靠它不能認定是同一個行程。 */
const gradeWords = ["超值", "精彩", "豪華", "特惠", "尊爵", "樂活", "歡樂", "親子", "快閃", "全覽", "經典"];

/** 官網地區用語 → 動態檔地區用語。只收已確認的對照。 */
const regionAliases: Record<string, string[]> = {
  河內: ["北越"],
  吉隆坡: ["馬來西亞"],
};

const airlineNames: Record<string, string> = {
  AE: "華信", B7: "立榮", BR: "長榮", CI: "華航", IT: "虎航", JX: "星宇", VZ: "越捷", "7C": "濟州航空",
  BX: "釜山航空", KE: "大韓", LJ: "真航空", OZ: "韓亞", TW: "德威", ZE: "易斯達", JL: "日航", MM: "樂桃",
  NH: "全日空", AK: "亞航", D7: "亞航", FD: "亞航", TR: "酷航", VJ: "越捷", VN: "越南航空", CA: "國航",
  CX: "國泰", MU: "東方", TK: "土耳其航空", EK: "阿聯酋", SQ: "新加坡航空", TG: "泰國航空", "7G": "星悅",
};

export function feedAirlineName(code: string) {
  return airlineNames[code] ?? "";
}

export function baseFeedRegion(region: string) {
  return region.replace(/^(中澳|高澳|中|高|南|澳)[／/]/, "").replace(/[＝=].*$/, "");
}

/**
 * 單字標記 → 該地區的行程名稱。
 * 「柱」只出現在「冰柱節」，所以「冰」指的是剩下的「冰釣」。
 */
export function resolveMarker(marker: string, products: string[], markersInRegion: Iterable<string>) {
  const holding = products.filter((name) => name.includes(marker));
  if (holding.length === 1) return holding[0];
  if (holding.length === 0) return "";
  const claimed = new Set<string>();
  for (const other of markersInRegion) {
    if (other === marker) continue;
    const only = products.filter((name) => name.includes(other));
    if (only.length === 1) claimed.add(only[0]);
  }
  const free = holding.filter((name) => !claimed.has(name));
  const leading = free.filter((name) => name.startsWith(marker));
  if (leading.length === 1) return leading[0];
  return free.length === 1 ? free[0] : "";
}

function dateTime(date: string) {
  const [year, month, day] = date.slice(0, 10).split("/").map(Number);
  return Date.UTC(year, month - 1, day);
}

/** 把各檔解析出的團，整理成可以配對的商品；只留今天以後出發的團。 */
export function buildFeedProducts(files: { name: string; groups: TourFeedGroup[] }[], todayTime: number): FeedProduct[] {
  const products = new Map<string, FeedProduct>();
  for (const file of files) {
    const fileName = file.name.replace(/[\s　]/g, "").replace(/[:：].*$/, "");
    const markersByRegion = new Map<string, Set<string>>();
    for (const group of file.groups) {
      const set = markersByRegion.get(group.region) ?? new Set<string>();
      for (const departure of group.departures) if (departure.variant) set.add(departure.variant);
      markersByRegion.set(group.region, set);
    }
    for (const group of file.groups) {
      const region = baseFeedRegion(group.region);
      for (const departure of group.departures) {
        if (dateTime(departure.date) < todayTime) continue;
        let { days } = departure;
        let marker = departure.variant;
        if (marker in numerals) {
          days = numerals[marker];
          marker = "";
        } else if (group.labelDays !== null && group.labelDays >= 10 && days < 10) {
          // 長程線的團號只寫天數末碼；以行程組標題的天數為準。
          days = group.labelDays;
        }
        if (/[★=＝*]/.test(marker)) marker = "";
        let name = group.label;
        if (marker) {
          const resolved = resolveMarker(marker, group.regionProducts, markersByRegion.get(group.region) ?? []);
          if (resolved) {
            name = resolved;
            marker = "";
          } else {
            name = `${group.label}·${marker}`;
          }
        }
        const key = `${fileName}｜${region}｜${name}｜${days}`;
        const product = products.get(key) ?? { key, file: fileName, region, name, marker, days, departures: [] };
        product.departures.push(departure);
        products.set(key, product);
      }
    }
  }
  return [...products.values()];
}

function priceNumber(text: string) {
  const digits = text.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function dayNumber(text: string) {
  const match = /\d+/.exec(text);
  return match ? Number(match[0]) : 0;
}

/** name 的每個字是否依序出現在 text 裡（「克斯」對「克羅埃西亞、斯洛維尼亞」）。 */
function inOrder(name: string, text: string) {
  let from = 0;
  for (const char of name) {
    const at = text.indexOf(char, from);
    if (at === -1) return false;
    from = at + 1;
  }
  return true;
}

type ProductScore = {
  score: number;
  reasons: string[];
  /** 行程名稱對得上。 */
  named: boolean;
  /** 地區對得上。 */
  placed: boolean;
  /** 官網已有的團期有一半以上和這個商品同日同價。 */
  proven: boolean;
  /** 只靠「超值」「豪華」這類每個地區都有的等級用語對上。 */
  generic: boolean;
  /** 名稱是整段或依序簡寫對上，不是「差一個字」的相近。 */
  exact: boolean;
};

function scoreProduct(trip: SiteTripForMatch, product: FeedProduct): ProductScore | null {
  const tripDays = dayNumber(trip.days);
  if (tripDays !== product.days) return null;

  const title = trip.title;
  const text = `${title}${trip.region}${trip.plans.map((plan) => plan.airline + plan.title).join("")}`;
  const reasons: string[] = [];
  let score = 0;

  const regionWords = [product.region.replace(/全覽$/, ""), ...(regionAliases[product.region] ?? [])].filter(Boolean);
  // 地區只看行程名稱與後台填的地區；方案裡的「濟州航空」不算去濟州。
  const placed = regionWords.some((word) => `${title}${trip.region}`.includes(word));
  if (placed) {
    score += 3;
    reasons.push("地區");
  }

  // 泰國線的組名帶英文字尾（精彩N）：比對時只看中文。
  const label = (product.marker ? product.name.split("·")[0] : product.name).replace(/[A-Za-z]+$/, "");
  if (!label) return null;
  const generic = gradeWords.includes(label);
  const titleGrades = gradeWords.filter((word) => title.includes(word));
  let named = false;
  let proven = false;
  let exact = false;

  if (product.marker) {
    // 標記還原不了：至少這個字要出現在行程名稱裡。
    if (!title.includes(product.marker)) return null;
    score += 3;
    reasons.push(`標記「${product.marker}」`);
    named = true;
  } else if (title.includes(label)) {
    score += generic ? 3 : 4;
    reasons.push("名稱");
    named = true;
    exact = true;
  } else if (generic) {
    // 等級不同（官網是「樂活」，這一組是「精彩」）就不是同一個商品。
    if (titleGrades.length > 0) return null;
  } else if (label.length >= 2 && inOrder(label, title)) {
    score += 3;
    reasons.push("名稱簡寫");
    named = true;
    exact = true;
  } else if (placed && label.length >= 3 && [...label].filter((char) => title.includes(char)).length >= label.length - 1) {
    score += 2;
    reasons.push("名稱相近");
    named = true;
  }

  // 官網標了等級、這個商品卻是不分等級的同名行程：稍微扣分，讓有標等級的那一組優先。
  if (!generic && !product.marker && titleGrades.length > 0 && !titleGrades.some((word) => product.name.includes(word))) score -= 1;

  const prices = new Set(product.departures.map((departure) => departure.price));
  const lowest = Math.min(...prices);
  const tripPrice = priceNumber(trip.price);
  if (tripPrice) {
    if (tripPrice === lowest) {
      score += 2;
      reasons.push("起價相同");
    } else if (prices.has(tripPrice)) {
      score += 1;
      reasons.push("價格出現過");
    } else if (Math.abs(tripPrice - lowest) / tripPrice > 0.4) {
      score -= 2;
    }
  }

  if (product.departures.some((departure) => airlineNames[departure.airline] && text.includes(airlineNames[departure.airline]))) {
    score += 1;
    reasons.push("航空");
  }

  if (trip.departures.length > 0) {
    const existing = new Set(trip.departures.map((departure) => `${departure.date.slice(0, 10)}|${priceNumber(departure.price)}`));
    const hits = product.departures.filter((departure) => existing.has(`${departure.date}|${departure.price}`)).length;
    const share = hits / trip.departures.length;
    if (share > 0) {
      score += 5 * share;
      reasons.push(`已有團期吻合 ${Math.round(share * 100)}%`);
      if (share >= 0.5) {
        named = true;
        proven = true;
      }
    }
  }

  return { score, reasons, named, placed, proven, exact, generic: generic || Boolean(product.marker) };
}

export function matchTrips(trips: SiteTripForMatch[], products: FeedProduct[]): TripMatch[] {
  // 同名同天數的商品在幾個地區出現。「滑雪」「賞楓」到處都有，沒對上地區時不能當候選。
  const sameName = new Map<string, number>();
  for (const product of products) sameName.set(`${product.name}|${product.days}`, (sameName.get(`${product.name}|${product.days}`) ?? 0) + 1);

  const matches = trips.map((trip): TripMatch => {
    const scored = products
      .flatMap((product) => {
        const result = scoreProduct(trip, product);
        if (!result || !result.named) return [];
        // 等級用語每個地區都有：地區沒對上（也沒有既有團期佐證）就不算候選。
        if (!result.placed && !result.proven) {
          if (result.generic || !result.exact) return [];
          if ((sameName.get(`${product.name}|${product.days}`) ?? 0) > 1) return [];
        }
        return [{ key: product.key, ...result }];
      })
      .sort((a, b) => b.score - a.score);
    const best = scored[0];
    const candidates = scored.slice(0, 3).map(({ key, score, reasons }) => ({ key, score: Math.round(score * 10) / 10, reasons }));
    if (!best) return { tripId: trip.id, status: "none", candidates: [] };
    const lead = best.score - (scored[1]?.score ?? -Infinity);
    // 自動套用的條件：名稱對得上、地區也對得上（或既有團期高度吻合），而且明顯比第二名像。
    const confident = (best.placed || best.proven) && best.score >= 6 && lead >= 1;
    return { tripId: trip.id, status: confident ? "auto" : "review", candidates };
  });

  // 同一個商品被兩個以上的官網行程認領：動態檔分不出它們，全部交給人確認。
  const claims = new Map<string, number>();
  for (const match of matches) if (match.status === "auto") claims.set(match.candidates[0].key, (claims.get(match.candidates[0].key) ?? 0) + 1);
  return matches.map(({ tripId, status, candidates }) => ({
    tripId,
    status: status === "auto" && (claims.get(candidates[0].key) ?? 0) > 1 ? "review" : status,
    candidates,
  }));
}
