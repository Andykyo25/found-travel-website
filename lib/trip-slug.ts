// 從中文行程名稱產生英文網址代稱，例如「北海道破冰船+玩雪6日」→ hokkaido-icebreaker-snow-6d。
// 用固定對照表，不呼叫 AI；表裡沒有的字就略過。後台與伺服器共用，不 import 伺服器端模組。
// 常出現但對照不到的地名或主題，加進下面三張表即可。

import type { SiteContent } from "./site-content";
import { cleanTripSlug } from "./trip-values.ts";

// 地名：國家、地區、城市、景點。
const places: Record<string, string> = {
  // 日本
  日本: "japan", 北海道: "hokkaido", 札幌: "sapporo", 函館: "hakodate", 小樽: "otaru", 富良野: "furano",
  美瑛: "biei", 旭川: "asahikawa", 網走: "abashiri", 知床: "shiretoko", 阿寒湖: "akan", 道東: "east-hokkaido",
  青池: "blue-pond", 東北: "tohoku", 青森: "aomori", 秋田: "akita", 岩手: "iwate", 山形: "yamagata",
  宮城: "miyagi", 仙台: "sendai", 福島: "fukushima", 藏王: "zao", 銀山: "ginzan", 東京: "tokyo",
  箱根: "hakone", 富士山: "mt-fuji", 富士: "fuji", 輕井澤: "karuizawa", 日光: "nikko", 橫濱: "yokohama",
  鎌倉: "kamakura", 關東: "kanto", 大阪: "osaka", 京都: "kyoto", 奈良: "nara", 神戶: "kobe", 關西: "kansai",
  北陸: "hokuriku", 立山黑部: "tateyama-kurobe", 黑部: "kurobe", 金澤: "kanazawa", 白川鄉: "shirakawago",
  合掌村: "shirakawago", 名古屋: "nagoya", 高山: "takayama", 四國: "shikoku", 廣島: "hiroshima",
  岡山: "okayama", 九州: "kyushu", 福岡: "fukuoka", 熊本: "kumamoto", 由布院: "yufuin", 湯布院: "yufuin",
  別府: "beppu", 鹿兒島: "kagoshima", 長崎: "nagasaki", 宮崎: "miyazaki", 沖繩: "okinawa",
  石垣島: "ishigaki", 宮古島: "miyakojima",
  // 韓國
  韓國: "korea", 南韓: "korea", 首爾: "seoul", 釜慶邱: "busan-gyeongju-daegu", 釜慶: "busan-gyeongju",
  釜山: "busan", 慶州: "gyeongju", 大邱: "daegu", 濟州: "jeju", 藍鼎: "landing-resort", 江原道: "gangwon",
  春川: "chuncheon", 南怡島: "nami-island", 仁川: "incheon", 全州: "jeonju", 雪嶽山: "seoraksan",
  // 中國、港澳
  中國: "china", 大陸: "china", 北京: "beijing", 上海: "shanghai", 張家界: "zhangjiajie",
  九寨溝: "jiuzhaigou", 桂林: "guilin", 黃山: "huangshan", 雲南: "yunnan", 麗江: "lijiang", 西藏: "tibet",
  新疆: "xinjiang", 絲路: "silk-road", 西安: "xian", 成都: "chengdu", 重慶: "chongqing", 江南: "jiangnan",
  杭州: "hangzhou", 蘇州: "suzhou", 哈爾濱: "harbin", 長白山: "changbaishan", 廈門: "xiamen",
  香港: "hong-kong", 澳門: "macau",
  // 東南亞、南亞
  泰國: "thailand", 曼谷: "bangkok", 清邁: "chiang-mai", 芭達雅: "pattaya", 普吉島: "phuket",
  越南: "vietnam", 峴港: "da-nang", 河內: "hanoi", 下龍灣: "ha-long-bay", 胡志明: "ho-chi-minh",
  富國島: "phu-quoc", 柬埔寨: "cambodia", 吳哥窟: "angkor-wat", 新加坡: "singapore", 馬來西亞: "malaysia",
  吉隆坡: "kuala-lumpur", 沙巴: "sabah", 檳城: "penang", 印尼: "indonesia", 峇里島: "bali",
  菲律賓: "philippines", 長灘島: "boracay", 宿霧: "cebu", 薄荷島: "bohol", 印度: "india", 尼泊爾: "nepal",
  斯里蘭卡: "sri-lanka", 馬爾地夫: "maldives",
  // 中東、非洲
  杜拜: "dubai", 土耳其: "turkey", 埃及: "egypt", 摩洛哥: "morocco", 約旦: "jordan", 以色列: "israel",
  // 歐洲
  歐洲: "europe", 北歐: "nordic", 東歐: "eastern-europe", 中歐: "central-europe", 西歐: "western-europe",
  南歐: "southern-europe", 英國: "uk", 倫敦: "london", 愛爾蘭: "ireland", 法國: "france", 巴黎: "paris",
  德國: "germany", 義大利: "italy", 羅馬: "rome", 威尼斯: "venice", 米蘭: "milan", 佛羅倫斯: "florence",
  西班牙: "spain", 巴塞隆納: "barcelona", 馬德里: "madrid", 葡萄牙: "portugal", 里斯本: "lisbon",
  瑞士: "switzerland", 少女峰: "jungfrau", 奧捷: "czech-austria", 奧地利: "austria", 維也納: "vienna",
  捷克: "czech", 布拉格: "prague", 匈牙利: "hungary", 克羅埃西亞: "croatia", 希臘: "greece",
  聖托里尼: "santorini", 荷蘭: "netherlands", 比利時: "belgium", 挪威: "norway", 羅弗敦: "lofoten",
  瑞典: "sweden", 芬蘭: "finland", 丹麥: "denmark", 冰島: "iceland", 俄羅斯: "russia",
  // 美洲、大洋洲
  美國: "usa", 美西: "us-west", 美東: "us-east", 阿拉斯加: "alaska", 夏威夷: "hawaii", 加拿大: "canada",
  墨西哥: "mexico", 秘魯: "peru", 澳洲: "australia", 紐西蘭: "new-zealand", 關島: "guam", 帛琉: "palau",
  塞班: "saipan",
};

// 主題：季節、活動、旅行方式。
const themes: Record<string, string> = {
  極光: "aurora", 流冰: "drift-ice", 破冰船: "icebreaker", 樹冰: "snow-monsters", 滑雪: "ski", 玩雪: "snow",
  賞雪: "snow", 雪祭: "snow-festival", 溫泉: "onsen", 點燈: "illumination", 燈會: "lantern-festival",
  賞楓: "autumn-foliage", 楓葉: "autumn-foliage", 紅葉: "autumn-foliage", 賞櫻: "cherry-blossom",
  櫻花: "cherry-blossom", 賞花: "flowers", 花海: "flower-fields", 花野: "flower-fields", 薰衣草: "lavender",
  花火: "fireworks", 煙火: "fireworks", 祭典: "festival", 郵輪: "cruise", 遊輪: "cruise", 鐵道: "rail",
  火車: "train", 健行: "hiking", 登山: "trekking", 峽灣: "fjords", 冰河: "glacier", 沙漠: "desert",
  跳島: "island-hopping", 海島: "island", 古城: "old-town", 世界遺產: "world-heritage", 秘境: "hidden-gems",
  夜景: "night-view", 美食: "food", 螃蟹: "crab", 海鮮: "seafood", 購物: "shopping", 迪士尼: "disney",
  環球影城: "universal-studios", 親子: "family", 蜜月: "honeymoon", 慢旅: "slow-travel",
  自由行: "self-guided", 半自助: "semi-guided", 包車: "private-car", 小包團: "small-group",
  員工旅遊: "company-trip",
};

// 修飾詞：只在沒有主題時補一個，用來區分同地點的不同行程。
const extras: Record<string, string> = {
  豪華: "luxury", 精緻: "deluxe", 特惠: "value", 超值: "value", 經典: "classic", 直飛: "nonstop",
  早鳥: "early-bird",
};

type Kind = "place" | "theme" | "extra";
const dictionary = new Map<string, { slug: string; kind: Kind }>([
  ...Object.entries(places).map(([zh, slug]) => [zh, { slug, kind: "place" as const }] as const),
  ...Object.entries(themes).map(([zh, slug]) => [zh, { slug, kind: "theme" as const }] as const),
  ...Object.entries(extras).map(([zh, slug]) => [zh, { slug, kind: "extra" as const }] as const),
]);
const longestKey = Math.max(...[...dictionary.keys()].map((key) => key.length));

function tokens(text: string) {
  const found: { slug: string; kind: Kind }[] = [];
  for (let index = 0; index < text.length; ) {
    let match: string | undefined;
    for (let length = Math.min(longestKey, text.length - index); length >= 2 && !match; length -= 1) {
      const candidate = text.slice(index, index + length);
      if (dictionary.has(candidate)) match = candidate;
    }
    if (match) {
      found.push(dictionary.get(match)!);
      index += match.length;
    } else index += 1;
  }
  return found;
}

const digits: Record<string, number> = { 一: 1, 二: 2, 兩: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };

function chineseNumber(value: string) {
  if (/^\d+$/.test(value)) return Number(value);
  // 十、十五、二十、二十一、五
  const [tens, ones] = value.includes("十") ? value.split("十") : ["", value];
  const total = (value.includes("十") ? (tens ? digits[tens] ?? 0 : 1) * 10 : 0) + (ones ? digits[ones] ?? 0 : 0);
  return total > 0 ? total : null;
}

/** 「5日」「五日遊」「15天」「十日」→ 5d／15d／10d。 */
export function tripDaysToken(...texts: string[]) {
  for (const text of texts) {
    const match = text.match(/(\d{1,2}|[一二兩三四五六七八九十]{1,3})\s*[日天]/);
    const days = match ? chineseNumber(match[1]) : null;
    if (days) return `${days}d`;
  }
  return "";
}

const unique = (items: string[]) => [...new Set(items)];

/** 由行程名稱（必要時參考地區與天數）產生英文代稱；完全對照不到時回傳空字串，網址改用行程 ID。 */
export function suggestTripSlug(trip: { title: string; region?: string; days?: string }) {
  let found = tokens(trip.title);
  if (!found.some((token) => token.kind === "place") && trip.region) found = [...tokens(trip.region), ...found];

  const placeSlugs = unique(found.filter((token) => token.kind === "place").map((token) => token.slug)).slice(0, 3);
  const themeSlugs = unique(found.filter((token) => token.kind === "theme").map((token) => token.slug)).slice(0, 2);
  const extraSlugs = themeSlugs.length
    ? []
    : unique(found.filter((token) => token.kind === "extra").map((token) => token.slug)).slice(0, 1);
  let words = [...placeSlugs, ...themeSlugs, ...extraSlugs];

  // 對照表沒有任何字時，退而使用名稱或地區裡原本就有的英文（例如「布拉格 Prague」）。
  if (words.length === 0) {
    words = unique(`${trip.title} ${trip.region ?? ""}`.toLowerCase().match(/[a-z]{3,}/g) ?? []).slice(0, 3);
  }
  if (words.length === 0) return "";

  const days = tripDaysToken(trip.title, trip.days ?? "");
  return cleanTripSlug([...words, days].filter(Boolean).join("-")).slice(0, 80).replace(/-+$/, "");
}

/** 代稱已被其他行程使用時，依序加上 -2、-3。 */
export function uniqueTripSlug(slug: string, taken: Iterable<string>) {
  if (!slug) return "";
  const used = new Set(taken);
  let candidate = slug;
  for (let suffix = 2; used.has(candidate); suffix += 1) candidate = `${slug}-${suffix}`;
  return candidate;
}

/**
 * 儲存時比對上一版：同一個行程（以 ID 對應）的代稱換了，就把舊代稱加進 previousSlugs，
 * 舊連結會轉到新網址。最多保留 10 個。
 */
export function carryPreviousSlugs(next: SiteContent, previous: SiteContent | null): SiteContent {
  if (!previous) return next;
  const before = new Map(previous.trips.map((trip) => [trip.id, trip]));
  return {
    ...next,
    trips: next.trips.map((trip) => {
      const old = before.get(trip.id);
      const history = [old?.slug ?? "", ...(old?.previousSlugs ?? []), ...(trip.previousSlugs ?? [])];
      const previousSlugs = [...new Set(history)].filter((slug) => slug && slug !== trip.slug).slice(0, 10);
      return previousSlugs.length ? { ...trip, previousSlugs } : trip;
    }),
  };
}
