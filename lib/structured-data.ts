// 搜尋引擎與 AI 讀的結構化資料（schema.org JSON-LD）。
// 只 import type 與純函式：頁尾等元件也會用到 telephoneHref。
import type { SiteContent, Trip } from "@/lib/site-content";
import { googleMapsPlaceUrl } from "@/lib/traveler-reviews";
import { priceValue, upcomingDepartures } from "@/lib/trip-values";

type JsonLdObject = Record<string, unknown>;

// 與 googleMapsPlaceUrl 同一個 Google 商家位置。搬家時兩邊要一起改。
const officeGeo = { latitude: 25.0816567, longitude: 121.5638093 };

export const siteDescription =
  "找到了旅行社是台北內湖的綜合旅行社，提供日本、韓國、歐洲精選跟團，以及親友自組客製與企業員工旅遊。線上查看出發團期、團費與完整行程，LINE 即時諮詢。";

/** 全站共用的公司實體 ID，其他頁面的行程、文章用它指回同一家旅行社。 */
export function agencyId(origin: string) {
  return `${origin}/#organization`;
}

export function telephoneHref(telephone: string) {
  return `tel:${telephone.replace(/(?:#|轉).*$/, "").replace(/[^\d+]/g, "")}`;
}

function absoluteUrl(path: string, origin: string) {
  try {
    return new URL(path, `${origin}/`).toString();
  } catch {
    return undefined;
  }
}

/** 「台北市內湖區內湖路…」拆成縣市、行政區與街道；拆不出來就整串放在街道。 */
export function postalAddress(address: string) {
  const match = address
    .trim()
    .match(/^(\d{3,6})?\s*([^\s\d]{2}[市縣])([^\s\d]{1,3}?[區鄉鎮市])(.+)$/u);
  return {
    "@type": "PostalAddress",
    ...(match
      ? {
          ...(match[1] ? { postalCode: match[1] } : {}),
          addressRegion: match[2],
          addressLocality: match[3],
          streetAddress: match[4].trim(),
        }
      : { streetAddress: address.trim() }),
    addressCountry: "TW",
  };
}

type AgencyFields = Pick<
  SiteContent,
  | "brandName"
  | "companyName"
  | "businessLicense"
  | "qualityLicense"
  | "taxId"
  | "address"
  | "telephone"
  | "email"
  | "lineUrl"
>;

export function travelAgencyJsonLd(content: AgencyFields, origin: string): JsonLdObject {
  const alternateNames = [content.brandName, "FOUND TRAVEL"].filter(
    (name, index, all) => name && name !== content.companyName && all.indexOf(name) === index,
  );
  const credentials = [
    content.businessLicense && {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "旅行業執照",
      name: content.businessLicense,
      recognizedBy: { "@type": "GovernmentOrganization", name: "交通部觀光署" },
    },
    content.qualityLicense && {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "旅行業品質保障協會會員",
      name: content.qualityLicense,
      recognizedBy: { "@type": "Organization", name: "中華民國旅行業品質保障協會" },
    },
  ].filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    "@id": agencyId(origin),
    name: content.companyName,
    alternateName: alternateNames,
    description: siteDescription,
    url: `${origin}/`,
    logo: `${origin}/brand/logo.png`,
    image: `${origin}/og-railway.png`,
    taxID: content.taxId,
    telephone: content.telephone || undefined,
    email: content.email || undefined,
    address: postalAddress(content.address),
    geo: { "@type": "GeoCoordinates", ...officeGeo },
    hasMap: googleMapsPlaceUrl,
    areaServed: { "@type": "Country", name: "台灣" },
    knowsLanguage: "zh-Hant",
    hasCredential: credentials,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      url: content.lineUrl,
      telephone: content.telephone || undefined,
      email: content.email || undefined,
      availableLanguage: "zh-Hant",
    },
    sameAs: [content.lineUrl, googleMapsPlaceUrl],
  };
}

export type BreadcrumbItem = { name: string; path: string };

export function breadcrumbJsonLd(items: BreadcrumbItem[], origin: string): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path.replace(/#.*$/, ""), origin),
    })),
  };
}

/**
 * 行程頁：TouristTrip＋價格。價格取未出發團期的最低／最高價；
 * 沒有團期價格時退回行程的參考起價；都讀不出數字就不放 offers，不猜價格。
 */
export function tripJsonLd(
  trip: Pick<Trip, "id" | "title" | "summary" | "region" | "days" | "image" | "price" | "departures">,
  content: Pick<SiteContent, "companyName">,
  origin: string,
  today: number,
): JsonLdObject {
  const url = `${origin}/dates/${trip.id}`;
  const prices = upcomingDepartures(trip.departures, today)
    .map((departure) => priceValue(departure.price))
    .filter((amount): amount is number => amount !== null && amount > 0);
  const startPrice = priceValue(trip.price);

  const offers = prices.length
    ? {
        "@type": "AggregateOffer",
        priceCurrency: "TWD",
        lowPrice: Math.min(...prices),
        highPrice: Math.max(...prices),
        offerCount: prices.length,
        url,
        seller: { "@id": agencyId(origin) },
      }
    : startPrice !== null && startPrice > 0
      ? {
          "@type": "Offer",
          priceCurrency: "TWD",
          price: startPrice,
          url,
          seller: { "@id": agencyId(origin) },
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    "@id": `${url}#trip`,
    name: trip.title,
    description: trip.summary,
    url,
    image: trip.image ? absoluteUrl(trip.image, origin) : undefined,
    itinerary: trip.region
      ? { "@type": "Place", name: trip.region }
      : undefined,
    provider: {
      "@type": "TravelAgency",
      "@id": agencyId(origin),
      name: content.companyName,
      url: `${origin}/`,
    },
    offers,
  };
}

/** JSON 放進 <script> 前把 < 轉義，避免內容裡的 </script> 提早結束標籤。 */
export function serializeJsonLd(data: JsonLdObject) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
