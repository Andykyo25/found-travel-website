import { getSiteContent } from "@/lib/site-content";
import { getRequestOrigin, getSiteOrigin, isTemporaryHost } from "@/lib/site-url";
import { tripDestinations, destinationTitle } from "@/lib/destinations";
import { siteDescription } from "@/lib/structured-data";
import { resolveTripPrice } from "@/lib/trip-summary";
import { bookableDepartures, formatPrice, parseDepartureDate, taipeiTodayTime, tripPath, upcomingDepartures } from "@/lib/trip-values";

export const dynamic = "force-dynamic";

// llms.txt：給 AI 助理與 AI 搜尋的網站導覽（https://llmstxt.org）。
// 用純文字列出公司是誰、有哪些行程、每個行程幾天多少錢何時出發，內容全部來自發布的行程資料。
export async function GET() {
  if (isTemporaryHost(await getRequestOrigin())) return new Response("Not found", { status: 404 });
  const [content, origin] = await Promise.all([getSiteContent(), getSiteOrigin()]);
  const today = taipeiTodayTime();
  const day = new Date(today).toISOString().slice(0, 10);
  const line = (text: string) => text.replace(/\s+/g, " ").trim();

  const company = [
    `- 公司名稱：${content.companyName}（品牌名：${content.brandName}，FOUND TRAVEL）`,
    content.businessLicense && `- 旅行業執照：${content.businessLicense}`,
    content.qualityLicense && `- 品保協會：${content.qualityLicense}`,
    content.taxId && `- 統一編號：${content.taxId}`,
    content.address && `- 地址：${content.address}`,
    content.telephone && `- 電話：${content.telephone}`,
    content.email && `- Email：${content.email}`,
    `- LINE 諮詢：${content.lineUrl}`,
    `- 服務：團體旅遊（跟團）、親友自組與客製旅遊、企業員工旅遊`,
  ].filter(Boolean);

  const destinations = tripDestinations(content.trips, today);
  const sections = destinations.map((destination) => {
    const trips = destination.trips.map((trip) => {
      const upcoming = upcomingDepartures(trip.departures, today);
      const open = bookableDepartures(trip.departures, today).filter((departure) => !/(^|[^將])額滿/.test(departure.note ?? ""));
      const price = formatPrice(resolveTripPrice(trip, today), true);
      const next = open[0] ? parseDepartureDate(open[0].date) : null;
      const dates = upcoming.length
        ? `${upcoming.length} 個出發日${next ? `，最近可報名 ${next.year}/${String(next.month).padStart(2, "0")}/${String(next.day).padStart(2, "0")}` : "，目前皆額滿"}`
        : "出發日期洽詢";
      return `- [${line(trip.title)}](${origin}${tripPath(trip)})：${[trip.region, trip.days, price, dates].filter(Boolean).map(line).join("・")}`;
    });
    return [`## ${destinationTitle(destination.name)}`, "", `全部行程：${origin}${encodeURI(destination.path)}`, "", ...trips].join("\n");
  });

  const body = [
    `# ${content.brandName}`,
    "",
    `> ${siteDescription}`,
    "",
    `資料時間：${day}（台灣時間）。出發日期、團費與額滿狀態定時更新；實際團位與價格以顧問回覆為準。`,
    "",
    "## 公司資訊",
    "",
    ...company,
    "",
    "## 主要頁面",
    "",
    `- [全部出發團期](${origin}/dates)：依月份查看所有已公布的出發日與團費`,
    `- [旅遊目的地](${origin}/destinations)：依國家與地區瀏覽行程`,
    `- [幫我找旅行](${origin}/find-trip)：依日期、預算與目的地篩選行程`,
    `- [VIP 集點](${origin}/vip)：參加指定行程累積點數，升等會員卡後享團費優惠`,
    `- [關於我們](${origin}/about)：服務理念與旅客回饋`,
    `- [聯絡與報名](${origin}/contact)：詢問表單`,
    `- [最新消息](${origin}/news)`,
    "",
    ...sections.flatMap((section) => [section, ""]),
  ].join("\n");

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
