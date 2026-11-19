// 搜尋引擎與 AI 讀的結構化資料（schema.org JSON-LD）。
// 只 import type 與純函式：頁尾等元件也會用到 telephoneHref。
import type { SiteContent, Trip, TripFaq } from "@/lib/site-content";
import { googleMapsPlaceUrl } from "@/lib/traveler-reviews";
import { bookableDepartures, priceValue, tripPath, upcomingDepartures } from "@/lib/trip-values";

type JsonLdObject = Record<string, unknown>;

// 與 googleMapsPlaceUrl 同一個 Google 商家位置。搬家時兩邊要一起改。
const officeGeo = { latitude: 25.0816567, longitude: 121.5638093 };

export const siteDescription =
  "找到了旅行社是台北內湖的綜合旅行社，提供出國精選跟團、親友自組客製旅遊與企業員工旅遊。線上查看出發團期、團費與完整行程，LINE 即時諮詢。";

/** Yui 的 Instagram；頁首、頁尾的社群連結與結構化資料共用。 */
export const instagramUrl = "https://www.instagram.com/yusyun1218/";

/**
 * 旅遊顧問 Yui 的實體資料：讓搜尋引擎與 AI 知道「這個網站的 Yui」是誰、在哪家旅行社服務，
 * 不會和其他同名的人（創作者、歌手）混在一起。內容只寫關於頁與頁尾公開過的事實。
 */
export const consultant = {
  name: "高郁勛",
  nickname: "Yui",
  jobTitle: "服務業務專員",
  description:
    "找到了旅行社的服務業務專員與旅遊顧問 Yui（高郁勛）。走訪超過 20 個國家、曾在日本生活五年，提供全球深度旅遊規劃、高端私人訂製旅行、高爾夫與滑雪主題假期，以及企業員工旅遊與獎勵旅遊。",
  knowsAbout: ["日本旅遊", "全球深度旅遊規劃", "私人訂製旅行", "高爾夫旅遊", "滑雪旅遊", "企業員工旅遊", "獎勵旅遊"],
  image: "/about/yui-mount-fuji.jpg",
};

export function consultantId(origin: string) {
  return `${origin}/about#yui`;
}

export function consultantJsonLd(content: Pick<SiteContent, "lineUrl" | "companyName">, origin: string): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": consultantId(origin),
    name: consultant.name,
    alternateName: [consultant.nickname, `${consultant.name}（${consultant.nickname}）`, `${content.companyName} ${consultant.nickname}`],
    jobTitle: consultant.jobTitle,
    description: consultant.description,
    image: `${origin}${consultant.image}`,
    url: `${origin}/about`,
    worksFor: { "@id": agencyId(origin) },
    knowsAbout: consultant.knowsAbout,
    knowsLanguage: "zh-Hant",
    sameAs: [instagramUrl],
    contactPoint: { "@type": "ContactPoint", contactType: "customer service", url: content.lineUrl, availableLanguage: "zh-Hant" },
  };
}

/** 全站共用的公司實體 ID，其他頁面的行程、文章用它指回同一家旅行社。 */
export function agencyId(origin: string) {
  return `${origin}/#organization`;
}

export function telephoneHref(telephone: string) {
  return `tel:${telephone.replace(/(?:#|轉).*$/, "").replace(/[^\d+]/g, "")}`;
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
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
    image: `${origin}/og-cover.jpg`,
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
    employee: { "@id": consultantId(origin) },
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
  trip: Pick<Trip, "id" | "slug" | "title" | "summary" | "region" | "days" | "image" | "price" | "departures" | "itinerary">,
  content: Pick<SiteContent, "companyName">,
  origin: string,
  today: number,
): JsonLdObject {
  const url = `${origin}${tripPath(trip)}`;
  const days = trip.itinerary ?? [];
  // 和頁面上的起價一致：額滿的團不算進價格範圍。
  const prices = bookableDepartures(trip.departures, today)
    .map((departure) => priceValue(departure.price))
    .filter((amount): amount is number => amount !== null && amount > 0);
  const startPrice = priceValue(trip.price);
  const upcoming = upcomingDepartures(trip.departures, today);
  const soldOut = upcoming.length > 0 && upcoming.every((departure) => /(^|[^將])額滿/.test(departure.note ?? ""));

  const offers = prices.length
    ? {
        "@type": "AggregateOffer",
        priceCurrency: "TWD",
        lowPrice: Math.min(...prices),
        highPrice: Math.max(...prices),
        offerCount: prices.length,
        // 公布的團期全部額滿時要講明，不要讓搜尋結果以為還買得到。
        availability: `https://schema.org/${soldOut ? "SoldOut" : "InStock"}`,
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
    // 有每日行程就列出每一天；沒有就至少標出目的地。
    itinerary: days.length
      ? {
          "@type": "ItemList",
          numberOfItems: days.length,
          itemListElement: days.map((day, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: `第 ${index + 1} 天${day.title ? `：${day.title}` : ""}`,
            // PDF 擷取的景點介紹可能很長，結構化資料只放開頭。
            description: day.description ? truncate(day.description.replace(/\s+/g, " "), 300) : undefined,
          })),
        }
      : trip.region
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

/** 行程頁的常見問題。Google 已不對一般網站顯示 FAQ 摘要，但 AI 搜尋仍會讀這種問答。 */
export function faqJsonLd(faqs: Pick<TripFaq, "question" | "answer">[], url: string): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url,
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

/** JSON 放進 <script> 前把 < 轉義，避免內容裡的 </script> 提早結束標籤。 */
export function serializeJsonLd(data: JsonLdObject) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
