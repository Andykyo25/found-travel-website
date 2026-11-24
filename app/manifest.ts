import type { MetadataRoute } from "next";

// 讓網站可以「加到主畫面」：手機上會用全螢幕開啟，像 APP 一樣有自己的圖示。
// 不上架 App Store / Google Play，跟公司其他組的 APP 不衝突。
// 圖示用 scripts/generate-pwa-icons.mjs 產生；顏色與 layout.tsx 的 themeColor、found.css 的 --f-paper 一致。
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "找到了旅行社",
    short_name: "找到了",
    description: "出國跟團、客製旅遊、員工旅遊。行程、出發團期與旅遊須知，打開就能看。",
    lang: "zh-Hant",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#faf8f3",
    theme_color: "#263a31",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "出發團期", url: "/dates" },
      { name: "幫我找旅行", url: "/find-trip" },
      { name: "最新消息", url: "/news" },
    ],
  };
}
