import type { Metadata, Viewport } from "next";
import { getSiteOrigin } from "@/lib/site-url";
import { FoundMotion } from "./components/FoundMotion";
import { display, latin, serif } from "./fonts";
import "./globals.css";
import "./editorial.css";
import "./found.css";

export const viewport: Viewport = {
  themeColor: "#263a31",
};

export async function generateMetadata(): Promise<Metadata> {
  // metadataBase 由請求標頭推導，各頁的相對 canonical 會依此展開成絕對網址。
  const metadataBase = new URL(await getSiteOrigin());

  return {
    metadataBase,
    title: {
      default: "找到了旅行社｜好旅行，被好好照顧",
      template: "%s｜找到了旅行社",
    },
    description:
      "找到了旅行社由熟悉目的地的旅行顧問，為你挑選合適的步調、住宿與體驗。查看精選行程與完整行程資料。",
    openGraph: {
      title: "找到了旅行社｜好旅行，被好好照顧",
      description: "把每一段期待，排成剛剛好的旅程。",
      type: "website",
      locale: "zh_TW",
      images: [
        {
          url: "/og-railway.png",
          width: 1200,
          height: 630,
          alt: "找到了旅行社暖日旅誌",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "找到了旅行社",
      description: "把每一段期待，排成剛剛好的旅程。",
      images: ["/og-railway.png"],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-Hant"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${latin.variable} ${serif.variable} ${display.variable}`}
    >
      <head>
        {/* 同一分頁已看過首頁序幕時，在首次繪製前就略過（避免閃一下）。 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(sessionStorage.getItem("found-intro"))document.documentElement.dataset.intro="skip"}catch(e){}`,
          }}
        />
      </head>
      <body>
        {children}
        <FoundMotion />
      </body>
    </html>
  );
}
