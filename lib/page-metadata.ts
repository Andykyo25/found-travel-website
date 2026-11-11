// 各頁共用的分享標籤（Open Graph／Twitter）。
//
// 頁面只要自己寫了 openGraph，Next 就整組蓋掉 layout 的預設值，不會逐欄合併：
// 少寫一欄就少一欄（關於頁曾因此沒有分享圖），而沒寫的頁面又全部沿用首頁的標題、沒有 og:url。
// 所以每一頁都用這個函式產生完整的一組。
import type { Metadata } from "next";

export const siteName = "找到了旅行社";
const defaultImage = { url: "/og-cover.jpg", width: 1200, height: 630, alt: "找到了旅行社暖日旅誌" };

export function socialMetadata({
  title,
  description,
  path,
  image,
  type = "website",
}: {
  /** 不含「｜找到了旅行社」的頁面標題。 */
  title: string;
  description: string;
  /** 這一頁的 canonical 路徑，例如 /about。 */
  path: string;
  /** 分享圖；沒給就用全站預設的封面。 */
  image?: string;
  type?: "website" | "article";
}): Pick<Metadata, "openGraph" | "twitter"> {
  const fullTitle = title.includes(siteName) ? title : `${title}｜${siteName}`;
  const images = image ? [{ url: image }] : [defaultImage];
  return {
    openGraph: { title: fullTitle, description, url: path, siteName, type, locale: "zh_TW", images },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: images.map((item) => item.url) },
  };
}

/**
 * 搜尋結果與分享卡片用的純文字：拿掉表情符號與裝飾用的項目符號，換行併成一行。
 * 行程摘要常是業務貼上的社群文案，原樣放進描述會出現一串符號與斷行。
 */
export function plainText(text: string) {
  return text
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu, " ")
    .replace(/[◆◇★☆●○■□▶►▪•✦✧]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateText(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
