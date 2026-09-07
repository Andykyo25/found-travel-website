import { formatDepartureDate } from "@/lib/trip-values";
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
  price: string;
  documentType: TripDocumentType;
  documentUrl: string;
  documentName: string;
  departureMode: TripPlanDepartureMode;
  departureIds: string[];
};

export type Trip = {
  id: string;
  featured: boolean;
  badge: string;
  region: string;
  days: string;
  title: string;
  summary: string;
  price: string;
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
    const plans = plansSource.flatMap((planValue, planIndex) => {
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
          price: safeOptionalString(plan.price, 60),
          documentType,
          documentUrl: safeDocumentUrl(plan.documentUrl, documentType),
          documentName: safeString(plan.documentName, "查看完整行程", 120),
          departureMode,
          departureIds: departureMode === "selected" ? departureIds : [],
        },
      ];
    });

    return [
      {
        id,
        featured: typeof source.featured === "boolean" ? source.featured : true,
        badge: safeString(source.badge, fallback.badge, 40),
        region: safeString(source.region, fallback.region, 60),
        days: safeString(source.days, fallback.days, 20),
        title: safeString(source.title, fallback.title, 100),
        summary: safeString(source.summary, fallback.summary, 500),
        price: safeString(source.price, fallback.price, 60),
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

// cache()：同一個請求裡 generateMetadata 與頁面本身都會取內容，
// 沒有這層包裝就會對 Bucket 讀兩次。
export const getSiteContentWithMeta = cache(
  async function getSiteContentWithMeta(): Promise<{
    content: SiteContent;
    meta: SiteContentMeta;
  }> {
    const emptyMeta: SiteContentMeta = {
      updatedAt: null,
      updatedBy: null,
      etag: null,
    };
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
  },
);

let lastSuccessfulContent: SiteContent | null = null;
export async function getSiteContent(): Promise<SiteContent> {
  try {
    return (await getSiteContentWithMeta()).content;
  } catch (error) {
    console.error("Unable to read published content", error);
    if (lastSuccessfulContent) return lastSuccessfulContent;
    throw error;
  }
}

export async function saveSiteContent(
  value: unknown,
  editorEmail: string,
  etag: string | null,
  previous: unknown,
): Promise<{ content: SiteContent; updatedAt: string }> {
  const content = normalizeSiteContent(value);
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
  await writeSiteContentObject(
    {
      ...content,
      _updatedAt: updatedAt,
      _updatedBy: editorEmail,
    },
    etag,
    previous,
  );
  return { content, updatedAt };
}
