// 把 sitemap 裡的所有網址一次送給 IndexNow（Bing 等）。
// 平常後台存檔會自動通知改到的行程；這支只在第一次啟用、或大量改版後手動跑一次：
//   node scripts/indexnow-submit.mjs https://tabiyoi.com
import { readFile } from "node:fs/promises";

const origin = new URL(process.argv[2] ?? "https://tabiyoi.com").origin;
const source = await readFile(new URL("../lib/indexnow.ts", import.meta.url), "utf8");
const key = source.match(/indexNowKey = "([0-9a-f]+)"/)?.[1];
if (!key) throw new Error("lib/indexnow.ts 裡找不到 indexNowKey");

const keyFile = await fetch(`${origin}/${key}.txt`);
if (!keyFile.ok || (await keyFile.text()).trim() !== key) {
  throw new Error(`${origin}/${key}.txt 還沒上線或內容不符，先部署再跑`);
}

const sitemap = await (await fetch(`${origin}/sitemap.xml`)).text();
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]).filter((url) => new URL(url).origin === origin);
console.log(`送出 ${urls.length} 個網址…`);

for (let i = 0; i < urls.length; i += 10_000) {
  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: new URL(origin).host, key, keyLocation: `${origin}/${key}.txt`, urlList: urls.slice(i, i + 10_000) }),
  });
  console.log(`HTTP ${response.status} ${await response.text()}`.trim());
}
