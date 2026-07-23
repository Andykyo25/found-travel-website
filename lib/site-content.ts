import { env } from "cloudflare:workers";

export type Destination = {
  city: string;
  timezone: string;
  currency: string;
  latitude: number;
  longitude: number;
};

export type Trip = {
  id: string;
  badge: string;
  region: string;
  days: string;
  title: string;
  summary: string;
  highlights: string;
  itinerary: string;
  price: string;
  image: string;
};

export type SiteContent = {
  brandName: string;
  announcement: string;
  heroKicker: string;
  heroTitle: string;
  heroText: string;
  videoTitle: string;
  videoUrl: string;
  contactTitle: string;
  contactText: string;
  contactEmail: string;
  contactPhone: string;
  lineUrl: string;
  destination: Destination;
  trips: Trip[];
};

type D1Result<T> = {
  results?: T[];
};

type D1Statement = {
  bind: (...values: unknown[]) => D1Statement;
  first: <T>() => Promise<T | null>;
  run: () => Promise<unknown>;
  all: <T>() => Promise<D1Result<T>>;
};

type D1DatabaseLike = {
  prepare: (query: string) => D1Statement;
  batch: (statements: D1Statement[]) => Promise<unknown>;
};

export const defaultSiteContent: SiteContent = {
  brandName: "Found・旅行顧問",
  announcement: "2026 夏秋慢旅行・接受預約中",
  heroKicker: "FOUND YOUR WAY",
  heroTitle: "好旅行，不只抵達，也被好好照顧。",
  heroText:
    "由熟悉目的地的顧問團隊，替你把每一段期待，排成剛剛好的旅程。",
  videoTitle: "這趟旅程，先從 60 秒開始",
  videoUrl: "https://www.youtube.com/watch?v=BPPMpti_Z14",
  contactTitle: "下一趟旅行，讓我們一起找到。",
  contactText:
    "告訴我們想去的地方、預計日期與同行者，顧問會用一對一方式協助你釐清方向。",
  contactEmail: "hello@foundtravel.tw",
  contactPhone: "+886-2-2345-6789",
  lineUrl: "https://line.me/",
  destination: {
    city: "東京",
    timezone: "Asia/Tokyo",
    currency: "JPY",
    latitude: 35.6762,
    longitude: 139.6503,
  },
  trips: [
    {
      id: "tokyo-slow",
      badge: "城市慢旅",
      region: "TOKYO・HAKONE",
      days: "5日",
      title: "東京慢旅 5日",
      summary:
        "住進喜歡的街區，以一日一重點的速度，走過東京與箱根的日常風景。",
      highlights: "設計旅宿\n小巷食堂\n箱根湖景",
      itinerary:
        "Day 1・抵達東京，顧問安排機場接送與街區散步\nDay 2・清澄白河咖啡與東京現代美術館\nDay 3・築地早晨、銀座選物與自由晚餐\nDay 4・箱根一日，蘆之湖與溫泉旅宿\nDay 5・最後採買，依航班返回台灣",
      price: "NT$36,800 起",
      image: "/trips/tokyo.jpg",
    },
    {
      id: "hokkaido-flower",
      badge: "季節限定",
      region: "HOKKAIDO",
      days: "7日",
      title: "北海道花野 7日",
      summary:
        "把薰衣草田、丘陵公路與溫泉時間排進一趟不趕路的北國夏日。",
      highlights: "富良野花田\n美瑛單車\n森林溫泉",
      itinerary:
        "Day 1・新千歲集合，入住札幌\nDay 2・小樽運河與職人店鋪\nDay 3・美瑛丘陵單車與農場午餐\nDay 4・富良野花田與葡萄酒莊\nDay 5・森林步道與溫泉旅宿\nDay 6・札幌自由活動與海鮮晚餐\nDay 7・依航班返回台灣",
      price: "NT$58,900 起",
      image: "/trips/hokkaido.jpg",
    },
    {
      id: "bali-healing",
      badge: "輕奢療癒",
      region: "BALI・UBUD",
      days: "6日",
      title: "峇里島療癒 6日",
      summary:
        "從烏布稻田到海邊日落，在島嶼的香氣與慢節奏裡，把自己放回旅行。",
      highlights: "烏布選旅\n私人瑜伽\n海景晚餐",
      itinerary:
        "Day 1・抵達峇里島，專車前往烏布\nDay 2・稻田散步、咖啡莊園與按摩\nDay 3・私人瑜伽、料理課與自由午後\nDay 4・移動至南部海岸，入住海景旅宿\nDay 5・海邊自由日與日落晚餐\nDay 6・依航班專車送機",
      price: "NT$42,500 起",
      image: "/trips/bali.jpg",
    },
  ],
};

function getD1(): D1DatabaseLike | null {
  return (
    (env as unknown as { DB?: D1DatabaseLike }).DB ??
    null
  );
}

async function ensureTables(db: D1DatabaseLike) {
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS site_content (
        id INTEGER PRIMARY KEY,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        updated_by TEXT
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS site_editors (
        email TEXT PRIMARY KEY,
        created_at TEXT NOT NULL
      )
    `),
  ]);
}

function safeString(value: unknown, fallback: string, max = 1000) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : fallback;
}

function safeNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max
    ? number
    : fallback;
}

export function normalizeSiteContent(value: unknown): SiteContent {
  const input =
    typeof value === "object" && value ? (value as Partial<SiteContent>) : {};
  const destinationInput =
    typeof input.destination === "object" && input.destination
      ? input.destination
      : defaultSiteContent.destination;
  const inputTrips = Array.isArray(input.trips) ? input.trips : [];
  const trips = defaultSiteContent.trips.map((fallback, index) => {
    const source =
      typeof inputTrips[index] === "object" && inputTrips[index]
        ? inputTrips[index]
        : fallback;
    return {
      id: fallback.id,
      badge: safeString(source.badge, fallback.badge, 40),
      region: safeString(source.region, fallback.region, 60),
      days: safeString(source.days, fallback.days, 20),
      title: safeString(source.title, fallback.title, 80),
      summary: safeString(source.summary, fallback.summary, 300),
      highlights: safeString(source.highlights, fallback.highlights, 300),
      itinerary: safeString(source.itinerary, fallback.itinerary, 2500),
      price: safeString(source.price, fallback.price, 60),
      image: safeString(source.image, fallback.image, 500),
    };
  });

  return {
    brandName: safeString(
      input.brandName,
      defaultSiteContent.brandName,
      60,
    ),
    announcement: safeString(
      input.announcement,
      defaultSiteContent.announcement,
      100,
    ),
    heroKicker: safeString(
      input.heroKicker,
      defaultSiteContent.heroKicker,
      60,
    ),
    heroTitle: safeString(
      input.heroTitle,
      defaultSiteContent.heroTitle,
      120,
    ),
    heroText: safeString(
      input.heroText,
      defaultSiteContent.heroText,
      300,
    ),
    videoTitle: safeString(
      input.videoTitle,
      defaultSiteContent.videoTitle,
      100,
    ),
    videoUrl: safeString(
      input.videoUrl,
      defaultSiteContent.videoUrl,
      500,
    ),
    contactTitle: safeString(
      input.contactTitle,
      defaultSiteContent.contactTitle,
      120,
    ),
    contactText: safeString(
      input.contactText,
      defaultSiteContent.contactText,
      400,
    ),
    contactEmail: safeString(
      input.contactEmail,
      defaultSiteContent.contactEmail,
      200,
    ),
    contactPhone: safeString(
      input.contactPhone,
      defaultSiteContent.contactPhone,
      60,
    ),
    lineUrl: safeString(input.lineUrl, defaultSiteContent.lineUrl, 500),
    destination: {
      city: safeString(
        destinationInput.city,
        defaultSiteContent.destination.city,
        50,
      ),
      timezone: safeString(
        destinationInput.timezone,
        defaultSiteContent.destination.timezone,
        80,
      ),
      currency: safeString(
        destinationInput.currency,
        defaultSiteContent.destination.currency,
        3,
      ).toUpperCase(),
      latitude: safeNumber(
        destinationInput.latitude,
        defaultSiteContent.destination.latitude,
        -90,
        90,
      ),
      longitude: safeNumber(
        destinationInput.longitude,
        defaultSiteContent.destination.longitude,
        -180,
        180,
      ),
    },
    trips,
  };
}

export async function getSiteContent(): Promise<SiteContent> {
  const db = getD1();
  if (!db) return defaultSiteContent;

  try {
    await ensureTables(db);
    const row = await db
      .prepare("SELECT payload FROM site_content WHERE id = 1")
      .first<{ payload: string }>();

    if (!row) {
      await db
        .prepare(
          "INSERT INTO site_content (id, payload, updated_at, updated_by) VALUES (1, ?, ?, ?)",
        )
        .bind(
          JSON.stringify(defaultSiteContent),
          new Date().toISOString(),
          "system",
        )
        .run();
      return defaultSiteContent;
    }

    return normalizeSiteContent(JSON.parse(row.payload));
  } catch {
    return defaultSiteContent;
  }
}

export async function saveSiteContent(
  value: unknown,
  editorEmail: string,
): Promise<SiteContent> {
  const db = getD1();
  if (!db) throw new Error("Content database is unavailable");
  const content = normalizeSiteContent(value);

  await ensureTables(db);
  await db
    .prepare(`
      INSERT INTO site_content (id, payload, updated_at, updated_by)
      VALUES (1, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        payload = excluded.payload,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
    `)
    .bind(JSON.stringify(content), new Date().toISOString(), editorEmail)
    .run();

  return content;
}

export async function claimOrCheckEditor(email: string): Promise<boolean> {
  const db = getD1();
  if (!db) return false;

  await ensureTables(db);
  const count = await db
    .prepare("SELECT COUNT(*) AS count FROM site_editors")
    .first<{ count: number }>();

  if (!count?.count) {
    await db
      .prepare(
        "INSERT OR IGNORE INTO site_editors (email, created_at) VALUES (?, ?)",
      )
      .bind(email.toLowerCase(), new Date().toISOString())
      .run();
  }

  const editor = await db
    .prepare("SELECT email FROM site_editors WHERE email = ?")
    .bind(email.toLowerCase())
    .first<{ email: string }>();

  return Boolean(editor);
}
