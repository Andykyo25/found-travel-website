import { Inter, Instrument_Serif, Noto_Serif_TC } from "next/font/google";

// 自託管（next/font 於建置時下載並隨站點提供），不在執行期向 Google 發送請求。
// 字體策略：中文內文走系統黑體（PingFang / 微軟正黑體，零下載、閱讀最順），
// 只有「標題」使用 Noto Serif TC。中日韓字型依 unicode-range 分段，
// 頁面只會載入實際用到的字元分段，因此不使用 preload。

// 拉丁字母與數字（內文、價格、日期）：輕量、字形清晰。
export const latin = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--ff-latin",
});

// 標題用中文襯線體，只載入 500 一個字重以壓低下載量。
export const serif = Noto_Serif_TC({
  weight: "500",
  display: "swap",
  preload: false,
  variable: "--ff-serif",
  fallback: ["Songti TC", "PMingLiU", "serif"],
});

// 只用於拉丁字母的襯線體：大型編號、斜體註腳與頁尾字標。
export const display = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  variable: "--ff-display",
});
