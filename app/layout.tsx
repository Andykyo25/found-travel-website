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
      default: "Found・旅行顧問｜好旅行，被好好照顧",
      template: "%s｜Found・旅行顧問",
    },
    description:
      "由熟悉目的地的旅行顧問，為你挑選合適的步調、住宿與體驗。查看精選行程、目的地資訊與旅行影片。",
    openGraph: {
      title: "Found・旅行顧問｜好旅行，被好好照顧",
      description: "把每一段期待，排成剛剛好的旅程。",
      type: "website",
      locale: "zh_TW",
      images: [
        {
          url: "/og.png",
          width: 1200,
          height: 630,
          alt: "Found・旅行顧問暖日旅誌",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Found・旅行顧問",
      description: "把每一段期待，排成剛剛好的旅程。",
      images: ["/og.png"],
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
