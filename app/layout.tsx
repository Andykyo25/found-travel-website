import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "found-travel.local";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const metadataBase = new URL(`${protocol}://${host}`);

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
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
