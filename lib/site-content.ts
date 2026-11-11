import { defaultHeroImages, normalizeHeroImages } from "./hero-slides";
import { cleanTripSlug, formatDepartureDate, taipeiTodayTime } from "@/lib/trip-values";
import { carryPreviousSlugs, suggestTripSlug, uniqueTripSlug } from "@/lib/trip-slug";
import { applyAutoPrices, stampTripUpdates } from "@/lib/trip-summary";
import { applyTourFeed } from "@/lib/tour-feed-overlay";
import { getTourFeedState } from "@/lib/tour-feed-store";
import { isPublicEmail, isPublicTelephone } from "@/lib/trip-validation";
import { cache } from "react";
import {
  readSiteContentObject,
  writeSiteContentObject,
} from "@/lib/railway-storage";

export type Destination = {
  city: string;
  timezone: string;
  currency: string;
  latitude: number;
  longitude: number;
};

export type TripDocumentType = "pdf" | "drive";

export type TripDeparture = {
  id: string;
  date: string;
  price: string;
  note?: string;
};

export type TripPlanDepartureMode = "all" | "selected";

export type TripPlan = {
  id: string;
  airline: string;
  title: string;
  summary: string;
  flight?: string;
  accommodation?: string;
  serviceType?: "group" | "custom" | "partial" | "unknown";
  departureAirport?: string;
  priceBasis?: "person" | "room" | "group" | "unknown";
  documentUpdatedAt?: string;
  price: string;
  documentType: TripDocumentType;
  documentUrl: string;
  documentName: string;
  departureMode: TripPlanDepartureMode;
  departureIds: string[];
};

export type TripDay = {
  id: string;
  title: string;
  description: string;
  meals: string;
  hotel: string;
};

export type TripFaq = { id: string; question: string; answer: string };

export type Trip = {
  id: string;
  /** 網址代稱（小寫英文、數字、-）。沒填時依行程名稱自動產生；仍對照不到才用行程 ID。 */
  slug?: string;
  /** 業務手動改過代稱：之後改行程名稱不會再自動更新代稱。 */
  slugManual?: boolean;
  /** 以前用過的代稱，舊連結會轉到目前的網址。儲存時自動記錄。 */
  previousSlugs?: string[];
  /** 每日行程。放在網頁上，旅客與搜尋引擎不必打開 PDF 就讀得到。 */
  itinerary?: TripDay[];
  /** 費用包含／不含、注意事項：每行一項。 */
  includes?: string;
  excludes?: string;
  notes?: string;
  faqs?: TripFaq[];
  featured: boolean;
  badge: string;
  region: string;
  days: string;
  title: string;
  summary: string;
  price: string;
  // "auto"：起始價格取目前所有出發日中最低的團期價格；未設定代表手動填寫（舊資料維持原樣）。
  priceMode?: "auto";
  /** 這個行程上次被修改的時間（ISO）。儲存時自動記錄，sitemap 用它告訴搜尋引擎哪些頁面真的更新了。 */
  updatedAt?: string;
  image: string;
  plans: TripPlan[];
  departures: TripDeparture[];
};

export type SiteContent = {
  brandName: string;
  announcement: string;
  heroKicker: string;
  heroTitle: string;
  heroText: string;
  heroImage: string;
  heroImages: string[];
  videoTitle: string;
  videoUrl: string;
  contactTitle: string;
  contactText: string;
  lineUrl: string;
  companyName: string;
  businessLicense: string;
  qualityLicense: string;
  taxId: string;
  representative: string;
  address: string;
  /** 對外客服電話；留空時前台與結構化資料都不顯示。 */
  telephone: string;
  /** 對外聯絡 Email；留空時前台與結構化資料都不顯示。 */
  email: string;
  destination: Destination;
  trips: Trip[];
};

export const defaultSiteContent: SiteContent = {
  brandName: "找到了旅行社",
  announcement: "專業規劃・安心出發・LINE 即時諮詢",
  heroKicker: "FOUND TRAVEL",
  heroTitle: "好旅行，不只抵達，也被好好照顧。",
  heroText:
    "由找到了旅行社的專業顧問團隊，替你把每一段期待，排成剛剛好的旅程。",
  heroImage: "",
  heroImages: [...defaultHeroImages],
  videoTitle: "旅行的樣子，先從一段影片開始",
  videoUrl: "/media/homepage.mp4",
  contactTitle: "下一趟旅行，讓我們一起找到。",
  contactText:
    "告訴我們想去的地方、預計日期與同行者，業務顧問會透過 LINE 一對一協助你規劃。",
  lineUrl: "https://lin.ee/OR5AYhI",
  companyName: "找到了旅行社股份有限公司",
  businessLicense: "綜合旅行社 │ 交觀綜字222700號",
  qualityLicense: "旅行業品質保障協會北2738號",
  taxId: "00161819",
  representative: "艾施鴻",
  address: "台北市內湖區內湖路一段120巷15弄25號3樓",
  telephone: "",
  email: "",
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
      featured: true,
      badge: "城市慢旅",
      region: "TOKYO・HAKONE",
      days: "5日",
      title: "東京慢旅 5日",
      summary: "住進喜歡的街區，以一日一重點的速度，走過東京與箱根的日常風景。",
      price: "NT$36,800 起",
      image: "/trips/tokyo.jpg",
      plans: [
        {
          id: "tokyo-standard",
          airline: "航空方案",
          title: "東京慢旅標準方案",
          summary: "航班與完整內容請查看行程資料。",
          price: "NT$36,800 起",
          documentType: "drive",
          documentUrl: "",
          documentName: "查看完整行程",
          departureMode: "all",
          departureIds: [],
        },
      ],
      departures: [],
    },
    {
      id: "hokkaido-flower",
      featured: true,
      badge: "季節限定",
      region: "HOKKAIDO",
      days: "7日",
      title: "北海道花野 7日",
      summary: "把薰衣草田、丘陵公路與溫泉時間排進一趟不趕路的北國夏日。",
      price: "NT$58,900 起",
      image: "/trips/hokkaido.jpg",
      plans: [
        {
          id: "hokkaido-standard",
          airline: "航空方案",
          title: "北海道花野標準方案",
          summary: "航班與完整內容請查看行程資料。",
          price: "NT$58,900 起",
          documentType: "drive",
          documentUrl: "",
          documentName: "查看完整行程",
          departureMode: "all",
          departureIds: [],
        },
      ],
      departures: [],
    },
    {
      id: "bali-healing",
      featured: true,
      badge: "輕奢療癒",
      region: "BALI・UBUD",
      days: "6日",
      title: "峇里島療癒 6日",
      summary: "從烏布稻田到海邊日落，在島嶼的香氣與慢節奏裡，把自己放回旅行。",
      price: "NT$42,500 起",
      image: "/trips/bali.jpg",
      plans: [
        {
          id: "bali-standard",
          airline: "航空方案",
          title: "峇里島療癒標準方案",
          summary: "航班與完整內容請查看行程資料。",
          price: "NT$42,500 起",
          documentType: "drive",
          documentUrl: "",
          documentName: "查看完整行程",
          departureMode: "all",
          departureIds: [],
        },
      ],
      departures: [],
    },
  ],
};

function safeString(value: unknown, fallback: string, max = 1000) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : fallback;
}

function safeOptionalString(value: unknown, max = 1000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
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

// 後台儲存時已擋下格式錯誤（validateContactInfo）；這裡再防一次舊資料或手動改壞的檔案，
// 格式不對就當作沒填，避免把錯的號碼送進搜尋引擎的公司資料。
function safeTelephone(value: unknown) {
  const phone = safeOptionalString(value, 30);
  return isPublicTelephone(phone) ? phone : "";
}

function safeEmail(value: unknown) {
  const email = safeOptionalString(value, 120);
  return isPublicEmail(email) ? email : "";
}

function safeDocumentUrl(value: unknown, type: TripDocumentType) {
  const raw = safeOptionalString(value, 1200);
  if (!raw) return "";

  if (type === "pdf" && raw.startsWith("/api/trip-pdf?key=")) {
    return raw;
  }

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:") return "";
    if (
      type === "drive" &&
      parsed.hostname !== "drive.google.com" &&
      parsed.hostname !== "docs.google.com"
    ) {
      return "";
    }
    return parsed.toString();
  } catch {
    return "";
  }
}

function uniqueId(value: unknown, fallback: string, used: Set<string>) {
  const base = safeString(value, fallback, 80).replace(/[^A-Za-z0-9_-]/g, "-") || fallback;
  let id = base;
  for (let suffix = 2; used.has(id); suffix += 1) id = `${base}-${suffix}`;
  used.add(id);
  return id;
}

function normalizeItinerary(value: unknown): TripDay[] {
  if (!Array.isArray(value)) return [];
  const used = new Set<string>();
  return value.slice(0, 40).flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const day = item as Partial<TripDay>;
    const title = safeOptionalString(day.title, 120);
    const description = safeOptionalString(day.description, 2000);
    if (!title && !description) return [];
    return [
      {
        id: uniqueId(day.id, `day-${index + 1}`, used),
        title,
        description,
        meals: safeOptionalString(day.meals, 200),
        hotel: safeOptionalString(day.hotel, 200),
      },
    ];
  });
}

function normalizeFaqs(value: unknown): TripFaq[] {
  if (!Array.isArray(value)) return [];
  const used = new Set<string>();
  return value.slice(0, 20).flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const faq = item as Partial<TripFaq>;
    const question = safeOptionalString(faq.question, 200);
    const answer = safeOptionalString(faq.answer, 1500);
    if (!question || !answer) return [];
    return [{ id: uniqueId(faq.id, `faq-${index + 1}`, used), question, answer }];
  });
}

export function normalizeSiteContent(value: unknown): SiteContent {
  const input =
    typeof value === "object" && value ? (value as Partial<SiteContent>) : {};
  const destinationInput =
    typeof input.destination === "object" && input.destination
      ? input.destination
      : defaultSiteContent.destination;
  const sourceTrips = Array.isArray(input.trips)
    ? input.trips
    : defaultSiteContent.trips;
  const usedIds = new Set<string>();
  const usedSlugs = new Set<string>();
  const trips = sourceTrips.flatMap((tripValue, index) => {
    if (!tripValue || typeof tripValue !== "object") return [];
    const source = tripValue as Partial<Trip> & {
      documentType?: unknown;
      documentUrl?: unknown;
      documentName?: unknown;
    };
    const fallback =
      defaultSiteContent.trips[index] ?? defaultSiteContent.trips[0];
    const baseId = safeString(source.id, `trip-${index + 1}`, 80).replace(
      /[^A-Za-z0-9_-]/g,
      "-",
    );
    let id = baseId || `trip-${index + 1}`;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);

    const departuresSource = Array.isArray(source.departures)
      ? source.departures
      : [];
    const usedDepartureIds = new Set<string>();
    const departures = departuresSource.flatMap(
      (departureValue, departureIndex) => {
        if (!departureValue || typeof departureValue !== "object") return [];
        const departure = departureValue as Partial<TripDeparture>;
        const date = safeOptionalString(departure.date, 40);
        if (!date) return [];

        const departureBaseId = safeString(
          departure.id,
          `departure-${departureIndex + 1}`,
          80,
        ).replace(/[^A-Za-z0-9_-]/g, "-");
        let departureId = departureBaseId || `departure-${departureIndex + 1}`;
        let departureSuffix = 2;
        while (usedDepartureIds.has(departureId)) {
          departureId = `${departureBaseId}-${departureSuffix}`;
          departureSuffix += 1;
        }
        usedDepartureIds.add(departureId);

        return [
          {
            id: departureId,
            date: formatDepartureDate(date),
            price: safeOptionalString(departure.price, 60),
            note: safeOptionalString(departure.note, 120),
          },
        ];
      },
    );

    const departureIdSet = new Set(departures.map((departure) => departure.id));
    const legacyDocumentType: TripDocumentType =
      source.documentType === "pdf" ? "pdf" : "drive";
    const plansSource = Array.isArray(source.plans)
      ? source.plans
      : [
          {
            id: "plan-1",
            airline: "航空方案",
            title: "標準行程方案",
            summary: "",
            price: source.price,
            documentType: legacyDocumentType,
            documentUrl: source.documentUrl,
            documentName: source.documentName,
            departureMode: "all",
            departureIds: [],
          },
        ];
    const usedPlanIds = new Set<string>();
    const plans = plansSource.flatMap<TripPlan>((planValue, planIndex) => {
      if (!planValue || typeof planValue !== "object") return [];
      const plan = planValue as Partial<TripPlan>;
      const fallbackPlan = fallback.plans[planIndex] ?? fallback.plans[0];
      const planBaseId = safeString(
        plan.id,
        `plan-${planIndex + 1}`,
        80,
      ).replace(/[^A-Za-z0-9_-]/g, "-");
      let planId = planBaseId || `plan-${planIndex + 1}`;
      let planSuffix = 2;
      while (usedPlanIds.has(planId)) {
        planId = `${planBaseId}-${planSuffix}`;
        planSuffix += 1;
      }
      usedPlanIds.add(planId);

      const documentType: TripDocumentType =
        plan.documentType === "pdf" ? "pdf" : "drive";
      const departureMode: TripPlanDepartureMode =
        plan.departureMode === "selected" ? "selected" : "all";
      const departureIds = Array.isArray(plan.departureIds)
        ? [
            ...new Set(
              plan.departureIds.filter(
                (departureId): departureId is string =>
                  typeof departureId === "string" &&
                  departureIdSet.has(departureId),
              ),
            ),
          ]
        : [];

      return [
        {
          id: planId,
          airline: safeString(plan.airline, fallbackPlan.airline, 80),
          title: safeString(plan.title, fallbackPlan.title, 120),
          summary: safeOptionalString(plan.summary, 400),
          flight: safeOptionalString(plan.flight, 120),
          accommodation: safeOptionalString(plan.accommodation, 120),
          serviceType: plan.serviceType === "group" || plan.serviceType === "custom" || plan.serviceType === "partial" ? plan.serviceType : "unknown",
          departureAirport: safeOptionalString(plan.departureAirport, 40),
          priceBasis: plan.priceBasis === "person" || plan.priceBasis === "room" || plan.priceBasis === "group" ? plan.priceBasis : "unknown",
          documentUpdatedAt: /^\d{4}-\d{2}-\d{2}$/.test(String(plan.documentUpdatedAt ?? "")) ? String(plan.documentUpdatedAt) : "",
          price: safeOptionalString(plan.price, 60),
          documentType,
          documentUrl: safeDocumentUrl(plan.documentUrl, documentType),
          documentName: safeString(plan.documentName, "查看完整行程", 120),
          departureMode,
          departureIds: departureMode === "selected" ? departureIds : [],
        },
      ];
    });

    // 代稱：有存就用存的；沒有就依名稱自動產生（下次儲存時寫入）。
    // 重複時（後台會擋，這裡防舊資料與自動產生的撞名）後面的行程加上 -2、-3。
    const storedSlug = cleanTripSlug(safeOptionalString(source.slug, 120));
    const slug = uniqueTripSlug(
      storedSlug ||
        suggestTripSlug({
          title: safeString(source.title, fallback.title, 100),
          region: safeString(source.region, fallback.region, 60),
          days: safeString(source.days, fallback.days, 20),
        }),
      usedSlugs,
    );
    if (slug) usedSlugs.add(slug);
    const slugManual = source.slugManual === true && Boolean(storedSlug);
    const previousSlugs = Array.isArray(source.previousSlugs)
      ? [
          ...new Set(
            source.previousSlugs
              .filter((value): value is string => typeof value === "string")
              .map(cleanTripSlug)
              .filter((value) => value && value !== slug),
          ),
        ].slice(0, 10)
      : [];
    const itinerary = normalizeItinerary(source.itinerary);
    const includes = safeOptionalString(source.includes, 3000);
    const excludes = safeOptionalString(source.excludes, 3000);
    const notes = safeOptionalString(source.notes, 3000);
    const faqs = normalizeFaqs(source.faqs);

    return [
      {
        id,
        // 新欄位只在有內容時寫入，舊行程的資料形狀維持不變。
        ...(slug ? { slug } : {}),
        ...(slugManual ? { slugManual } : {}),
        ...(previousSlugs.length ? { previousSlugs } : {}),
        ...(itinerary.length ? { itinerary } : {}),
        ...(includes ? { includes } : {}),
        ...(excludes ? { excludes } : {}),
        ...(notes ? { notes } : {}),
        ...(faqs.length ? { faqs } : {}),
        featured: typeof source.featured === "boolean" ? source.featured : true,
        badge: safeString(source.badge, fallback.badge, 40),
        region: safeString(source.region, fallback.region, 60),
        days: safeString(source.days, fallback.days, 20),
        title: safeString(source.title, fallback.title, 100),
        summary: safeString(source.summary, fallback.summary, 500),
        price: safeString(source.price, fallback.price, 60),
        ...(source.priceMode === "auto" ? { priceMode: "auto" as const } : {}),
        ...(typeof source.updatedAt === "string" && Number.isFinite(Date.parse(source.updatedAt)) ? { updatedAt: new Date(source.updatedAt).toISOString() } : {}),
        image: safeString(source.image, fallback.image, 800),
        plans,
        departures,
      },
    ];
  });

  const savedBrandName = safeString(
    input.brandName,
    defaultSiteContent.brandName,
    60,
  );
  const savedLineUrl = safeString(
    input.lineUrl,
    defaultSiteContent.lineUrl,
    500,
  );

  return {
    brandName:
      savedBrandName === "Found・旅行顧問"
        ? defaultSiteContent.brandName
        : savedBrandName,
    announcement: safeString(
      input.announcement,
      defaultSiteContent.announcement,
      100,
    ),
    heroKicker: safeString(input.heroKicker, defaultSiteContent.heroKicker, 60),
    heroTitle: safeString(input.heroTitle, defaultSiteContent.heroTitle, 120),
    heroText: safeString(input.heroText, defaultSiteContent.heroText, 300),
    // 留空時前台會退回使用第一個行程的封面圖。
    heroImage: safeOptionalString(input.heroImage, 800),
    heroImages: normalizeHeroImages(input.heroImages, safeOptionalString(input.heroImage, 800)),
    videoTitle: safeString(
      input.videoTitle,
      defaultSiteContent.videoTitle,
      100,
    ),
    videoUrl: defaultSiteContent.videoUrl,
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
    lineUrl:
      savedLineUrl === "https://line.me/"
        ? defaultSiteContent.lineUrl
        : savedLineUrl,
    companyName: safeString(
      input.companyName,
      defaultSiteContent.companyName,
      100,
    ),
    businessLicense: safeString(
      input.businessLicense,
      defaultSiteContent.businessLicense,
      120,
    ),
    qualityLicense: safeString(
      input.qualityLicense,
      defaultSiteContent.qualityLicense,
      120,
    ),
    taxId: safeString(input.taxId, defaultSiteContent.taxId, 20),
    representative: safeString(
      input.representative,
      defaultSiteContent.representative,
      40,
    ),
    address: safeString(input.address, defaultSiteContent.address, 200),
    telephone: safeTelephone(input.telephone),
    email: safeEmail(input.email),
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

export type SiteContentMeta = {
  updatedAt: string | null;
  updatedBy: string | null;
  etag: string | null;
};

type StoredSiteContent = Partial<SiteContent> & {
  _updatedAt?: unknown;
  _updatedBy?: unknown;
};

// 實際向 Bucket 讀取並整理發布內容。
async function loadSiteContentWithMeta(): Promise<{
  content: SiteContent;
  meta: SiteContentMeta;
}> {
  const emptyMeta: SiteContentMeta = {
    updatedAt: null,
    updatedBy: null,
    etag: null,
  };
  // A local, explicit design review uses only a snapshot of public content.
  // Production always reads the configured Bucket, even if this flag is set.
  if (process.env.NODE_ENV === "development" && process.env.FOUND_DESIGN_PREVIEW === "1") {
    const { readFile } = await import("node:fs/promises");
    const snapshot = JSON.parse(await readFile(`${process.cwd()}/work/design-preview.json`, "utf8"));
    if (!snapshot || !Array.isArray(snapshot.trips)) throw new Error("Invalid design preview snapshot");
    return { content: normalizeSiteContent(snapshot), meta: emptyMeta };
  }
  const stored = await readSiteContentObject<StoredSiteContent>();
  if (!stored) return { content: defaultSiteContent, meta: emptyMeta };
  const saved = stored.value;
  if (!saved || typeof saved !== "object" || !Array.isArray(saved.trips))
    throw new Error("Invalid stored content");
  const content = normalizeSiteContent(saved);
  lastSuccessfulContent = content;
  return {
    content,
    meta: {
      etag: stored.etag,
      updatedAt:
        typeof saved._updatedAt === "string" ? saved._updatedAt : null,
      updatedBy:
        typeof saved._updatedBy === "string" ? saved._updatedBy : null,
    },
  };
}

// cache()：同一個請求裡 generateMetadata 與頁面本身都會取內容，
// 沒有這層包裝就會對 Bucket 讀兩次。後台編輯用這個，一律直接讀 Bucket。
export const getSiteContentWithMeta = cache(loadSiteContentWithMeta);

let lastSuccessfulContent: SiteContent | null = null;

// 前台每個請求都去讀 Bucket 會拖慢回應，發布內容留在記憶體。
// 超過 30 秒就在背景重讀，當下這位訪客先拿手上的內容，不用等 Bucket（讀一次約半秒）；
// 訪客不多的時段幾乎每個人都隔超過 30 秒才來，等於每個人都要等。
// 後台儲存走同一台伺服器，存完立刻換成新內容（saveSiteContent），業務不用等。
// 日後若開多台伺服器，其他台會在下一位訪客來過之後更新；
// 手上的內容超過 10 分鐘就不再直接沿用，等讀完 Bucket 才回應。
const publicContentTtlMs = 30_000;
const publicContentMaxAgeMs = 10 * 60_000;
let publicContent: { content: SiteContent; at: number } | null = null;
let publicContentRefresh: Promise<SiteContent> | null = null;
let publicContentRefreshFailed = false;
// 每次換內容就加一：背景重讀若是在儲存之前開始的，讀到的是舊內容，不能蓋掉剛存好的新內容。
let publicContentVersion = 0;

function setPublicContent(content: SiteContent) {
  publicContent = { content, at: Date.now() };
  publicContentVersion += 1;
  publicContentRefreshFailed = false;
}

function refreshPublicContent(): Promise<SiteContent> {
  const version = publicContentVersion;
  publicContentRefresh ??= loadSiteContentWithMeta()
    .then(({ content }) => {
      if (version !== publicContentVersion && publicContent) return publicContent.content;
      setPublicContent(content);
      return content;
    })
    .catch((error) => {
      publicContentRefreshFailed = true;
      throw error;
    })
    .finally(() => {
      publicContentRefresh = null;
    });
  return publicContentRefresh;
}

// strict：最近一次重讀失敗時，不沿用手上的內容，改成等這次讀完（失敗就讓呼叫端知道）。
async function publishedContent(strict: boolean): Promise<SiteContent> {
  const age = publicContent ? Date.now() - publicContent.at : Number.POSITIVE_INFINITY;
  if (
    publicContent &&
    age < publicContentMaxAgeMs &&
    !(strict && publicContentRefreshFailed) &&
    process.env.NODE_ENV !== "development"
  ) {
    if (age >= publicContentTtlMs)
      void refreshPublicContent().catch((error) =>
        console.error("Unable to refresh published content", error),
      );
    return publicContent.content;
  }
  return refreshPublicContent();
}

// 前台讀取用：自動計算起始價格的行程，在這裡依「今天」的團期算出最新價格。
// 後台編輯用 getSiteContentWithMeta()，拿到的是原樣儲存的內容。
// 業務系統同步來的團期在這裡套上去（有對應的行程才會換），再算起始價格。
async function forVisitors(content: SiteContent): Promise<SiteContent> {
  const today = taipeiTodayTime();
  const feed = await getTourFeedState();
  return applyAutoPrices(applyTourFeed(content, feed.snapshot, feed.links, today), today);
}

export async function getSiteContent(): Promise<SiteContent> {
  try {
    return await forVisitors(await publishedContent(false));
  } catch (error) {
    console.error("Unable to read published content", error);
    if (lastSuccessfulContent) return forVisitors(lastSuccessfulContent);
    throw error;
  }
}

// 「幫我找旅行」用：行程來源讀不到時要明講並停用配對，不拿舊行程當成最新的。
// 讀取正常時和其他前台頁面共用同一份記憶體內容；最近一次重讀失敗就回傳 null。
export async function getSiteContentIfAvailable(): Promise<SiteContent | null> {
  try {
    return await forVisitors(await publishedContent(true));
  } catch (error) {
    console.error("Unable to read published content", error);
    return null;
  }
}

/** 測試用：清掉記憶體裡的發布內容，讓下一次讀取重新向 Bucket 要。 */
export function clearPublicContentCache() {
  publicContent = null;
  publicContentRefresh = null;
  publicContentRefreshFailed = false;
  publicContentVersion += 1;
}

export async function saveSiteContent(
  value: unknown,
  editorEmail: string,
  etag: string | null,
  previous: unknown,
): Promise<{ content: SiteContent; updatedAt: string }> {
  if (process.env.NODE_ENV === "development" && process.env.FOUND_DESIGN_PREVIEW === "1") {
    throw new Error("本機設計預覽不接受內容儲存");
  }
  const previousContent = previous && typeof previous === "object" ? normalizeSiteContent(previous) : null;
  const previousTime =
    previous &&
    typeof previous === "object" &&
    "_updatedAt" in previous &&
    typeof previous._updatedAt === "string"
      ? Date.parse(previous._updatedAt)
      : 0;
  const updatedAt = new Date(
    Math.max(
      Date.now(),
      (Number.isFinite(previousTime) ? previousTime : 0) + 1,
    ),
  ).toISOString();
  // 代稱改了（手動或跟著名稱自動更新）就把舊的記下來，舊連結才轉得過去；
  // 內容有變的行程記下這次的時間，沒變的維持原本的時間。
  const content = stampTripUpdates(
    carryPreviousSlugs(normalizeSiteContent(value), previousContent),
    previousContent,
    updatedAt,
  );
  await writeSiteContentObject(
    {
      ...content,
      _updatedAt: updatedAt,
      _updatedBy: editorEmail,
    },
    etag,
    previous,
  );
  setPublicContent(content);
  lastSuccessfulContent = content;
  return { content, updatedAt };
}
