// 產生「加到主畫面」用的圖示（PWA manifest 與 iPhone 主畫面）。
// 圖形取自 app/icon.svg 的愛心定位標記；改了品牌圖示後重新執行：
//   node scripts/generate-pwa-icons.mjs
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const paper = "#faf8f3";
const heart =
  '<path d="M32 57C14 42 5 31 5 21.5 5 13.5 11.2 8 18.6 8c5.2 0 10 2.9 13.4 8.2C35.4 10.9 40.2 8 45.4 8 52.8 8 59 13.5 59 21.5 59 31 50 42 32 57Z" fill="#e8317c"/><circle cx="32" cy="29" r="9" fill="none" stroke="#fff" stroke-width="3.6"/><circle cx="32" cy="29" r="2.6" fill="#fff"/>';

/** 愛心佔畫面寬度的比例：maskable 會被系統裁成圓形或圓角方形，要留在中間 80% 的安全範圍內。 */
function iconSvg(size, scale) {
  const box = 64 / scale;
  const offset = (box - 64) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${-offset} ${-offset + 0.5} ${box} ${box}"><rect x="${-offset}" y="${-offset + 0.5}" width="${box}" height="${box}" fill="${paper}"/>${heart}</svg>`;
}

const outputs = [
  { file: "public/icons/icon-192.png", size: 192, scale: 0.72 },
  { file: "public/icons/icon-512.png", size: 512, scale: 0.72 },
  { file: "public/icons/maskable-512.png", size: 512, scale: 0.54 },
  // Next 的檔案慣例：app/apple-icon.png 會自動輸出 <link rel="apple-touch-icon">。
  { file: "app/apple-icon.png", size: 180, scale: 0.66 },
];

await mkdir("public/icons", { recursive: true });
for (const { file, size, scale } of outputs) {
  await sharp(Buffer.from(iconSvg(size, scale))).png({ compressionLevel: 9 }).toFile(file);
  console.log(file);
}
