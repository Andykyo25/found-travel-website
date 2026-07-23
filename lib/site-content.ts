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

export type Trip = {
  id: string;
  badge: string;
  region: string;
  days: string;
  title: string;
  summary: string;
  price: string;
  image: string;
  documentType: TripDocumentType;
  documentUrl: string;
  documentName: string;
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
      badge: "城市慢旅",
      region: "TOKYO・HAKONE",
      days: "5日",
      title: "東京慢旅 5日",
      summary:
        "住進喜歡的街區，以一日一重點的速度，走過東京與箱根的日常風景。",
      price: "NT$36,800 起",
      image: "/trips/tokyo.jpg",
      documentType: "drive",
      documentUrl: "",
      documentName: "查看完整行程",
    },
    {
      id: "hokkaido-flower",
      badge: "季節限定",
      region: "HOKKAIDO",
      days: "7日",
      title: "北海道花野 7日",
      summary:
        "把薰衣草田、丘陵公路與溫泉時間排進一趟不趕路的北國夏日。",
      price: "NT$58,900 起",
      image: "/trips/hokkaido.jpg",
      documentType: "drive",
      documentUrl: "",
      documentName: "查看完整行程",
    },
    {
      id: "bali-healing",
      badge: "輕奢療癒",
      region: "BALI・UBUD",
      days: "6日",
      title: "峇里島療癒 6日",
      summary:
        "從烏布稻田到海邊日落，在島嶼的香氣與慢節奏裡，把自己放回旅行。",
      price: "NT$42,500 起",
      image: "/trips/bali.jpg",
      documentType: "drive",
      documentUrl: "",
      documentName: "查看完整行程",
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
    const source = tripValue as Partial<Trip>;
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

    const documentType: TripDocumentType =
      source.documentType === "pdf" ? "pdf" : "drive";

    return [
      {
        id,
        badge: safeString(source.badge, fallback.badge, 40),
        region: safeString(source.region, fallback.region, 60),
        days: safeString(source.days, fallback.days, 20),
        title: safeString(source.title, fallback.title, 100),
        summary: safeString(source.summary, fallback.summary, 500),
        price: safeString(source.price, fallback.price, 60),
        image: safeString(source.image, fallback.image, 800),
        documentType,
        documentUrl: safeDocumentUrl(source.documentUrl, documentType),
        documentName: safeString(
          source.documentName,
          "查看完整行程",
          120,
        ),
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

export async function getSiteContent(): Promise<SiteContent> {
  try {
    const saved = await readSiteContentObject<SiteContent>();
    return saved ? normalizeSiteContent(saved) : defaultSiteContent;
  } catch {
    return defaultSiteContent;
  }
}

export async function saveSiteContent(
  value: unknown,
  editorEmail: string,
): Promise<SiteContent> {
  const content = normalizeSiteContent(value);
  await writeSiteContentObject({
    ...content,
    _updatedAt: new Date().toISOString(),
    _updatedBy: editorEmail,
  });
  return content;
}
