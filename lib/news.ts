// 最新消息的內容都放在這裡。新增一則消息：在 newsArticles 加一筆資料，
// 列表、內頁、網站地圖都會自動帶出，不需要另外新增頁面。
// 涉及規定或費用的內容請附上 sources，並更新 publishedAt 或 updatedAt。

export type NewsLink = { label: string; href: string };

export type NewsMethod = {
  name: string;
  badge?: string;
  audience: string;
  steps: string[];
  note?: string;
  link?: NewsLink;
};

type NewsSection = { id: string; title: string };

export type NewsBlock = NewsSection &
  (
    | { kind: "text"; paragraphs: string[] }
    | { kind: "facts"; items: { label: string; value: string; note: string }[] }
    | {
        kind: "compare";
        columns: [string, string];
        rows: { label: string; before: string; after: string }[];
      }
    | { kind: "methods"; lede: string; items: NewsMethod[] }
    | { kind: "names"; lede: string; items: string[]; note: string }
    | { kind: "tips"; items: { title: string; text: string }[] }
  );

export type NewsArticle = {
  slug: string;
  title: string;
  /** 麵包屑用的短標題。 */
  shortTitle: string;
  category: string;
  /** YYYY-MM-DD，列表依此由新到舊排序。 */
  publishedAt: string;
  updatedAt?: string;
  author?: string;
  summary: string;
  image: string;
  imageAlt: string;
  blocks: NewsBlock[];
  video?: { title: string; text: string; link: NewsLink };
  sources: NewsLink[];
  disclaimer?: string;
  closing?: { title: string; text: string };
};

export const newsArticles: NewsArticle[] = [
  {
    slug: "japan-tax-free-2026",
    title: "日本免稅新制 11/1 上路：退稅 3 種方式一次看懂",
    shortTitle: "日本免稅新制",
    category: "日本旅遊須知",
    publishedAt: "2026-10-31",
    author: "Yui",
    summary:
      "2026 年 11 月 1 日起，日本購物改為先付含稅價，離境完成海關確認後才退稅。看了這麼多攻略還是霧颯颯？Yui 幫大家整理好了，其實退稅主要就是這 3 種方式。",
    image: "/trips/tokyo.jpg",
    imageAlt: "箱根蘆之湖畔的紅色鳥居，立在平靜的湖水之中",
    blocks: [
      {
        kind: "facts",
        id: "key-facts",
        title: "先看重點",
        items: [
          {
            label: "上路日期",
            value: "2026/11/1",
            note: "以購買日為準：10/31 以前買的適用舊制，11/1 起買的適用新制。",
          },
          {
            label: "購物門檻",
            value: "¥5,000",
            note: "同一家店、同一天，未稅金額合計達 5,000 日圓以上。",
          },
          {
            label: "海關確認期限",
            value: "90 天",
            note: "購買日起 90 天內，帶著商品離境並完成海關確認。",
          },
        ],
      },
      {
        kind: "compare",
        id: "what-changed",
        title: "新舊制差在哪",
        columns: ["2026/10/31 以前購買", "2026/11/1 起購買"],
        rows: [
          {
            label: "結帳金額",
            before: "未稅價，當場免稅",
            after: "含稅價，先付再退",
          },
          {
            label: "拿回稅金",
            before: "不需另外申請",
            after: "海關確認後，由店家或退稅業者退款",
          },
          {
            label: "消耗品",
            before: "需特殊包裝，上限 50 萬日圓",
            after: "取消特殊包裝與上限，但在日本用掉就不能退",
          },
        ],
      },
      {
        kind: "methods",
        id: "three-ways",
        title: "退稅主要有 3 種方式",
        lede: "前兩種是完成海關確認的做法，選一種就好；第三種是提早拿到現金，出境時一樣要做海關確認。",
        items: [
          {
            name: "Visit Japan Web",
            badge: "最推薦",
            audience: "習慣用手機、想少排隊的人",
            steps: [
              "出發前先註冊 VJW，填好護照資料；抵達日本後補上入境許可資訊",
              "購物時出示免稅 QR Code（不是每家店都支援，護照記得帶著）",
              "到機場，託運行李前先連上海關專用 Wi-Fi",
              "登入 VJW 點「退稅手續」，核對紀錄後按 Confirm",
              "顯示 Completed 就完成海關確認；顯示 Not Completed 請帶商品到海關檢查處",
              "等待退款至指定帳戶或信用卡",
            ],
            note: "可線上辦理的機場：成田、羽田、關西、中部、新千歲、福岡、那霸。系統介面只有英文，操作不順時改用機場機台就好。",
            link: {
              label: "前往 Visit Japan Web",
              href: "https://services.digital.go.jp/visit-japan-web/",
            },
          },
          {
            name: "機場自助機台",
            audience: "長輩不會用手機也沒關係",
            steps: [
              "託運行李前，到國際線出境大廳的免稅手續機台掃描護照",
              "依照畫面指示操作：綠燈代表完成；紅燈請帶商品到海關檢查處，由海關人工確認",
              "依購物時店家說明的方式收款，例如信用卡、帳戶或 App",
            ],
            note: "用機台不需要註冊 VJW。部分機場也能領現金，但多半要付手續費，能不能領要看店家配合的退稅業者。",
            link: {
              label: "查詢各機場機台位置",
              href: "https://www.customs.go.jp/kaigairyoko/taxrefund/map.htm",
            },
          },
          {
            name: "市區先行退稅",
            audience: "想在離境前先拿到現金的人",
            steps: [
              "到指定店家辦理，例如友都八喜部分門市",
              "在櫃台選擇現金，離境前先拿到退款",
              "出境時仍須完成海關確認，用 VJW 或機場機台都可以",
            ],
            note: "友都八喜目前有 11 家門市提供：新宿、池袋、秋葉原、上野、橫濱、名古屋、京都、梅田、博多、札幌、仙台。據報導辦理時需登記本人信用卡作為擔保，沒有完成海關確認，款項與手續費可能從卡片扣回。",
          },
        ],
      },
      {
        kind: "names",
        id: "zero-fee",
        title: "退稅申請 0 手續費店家",
        lede: "新制的手續費由各店家與退稅業者自訂，日本政府沒有統一標準。目前公布由店家吸收退稅申請手續費的有：",
        items: ["唐吉訶德 DONKI", "Bic Camera", "多慶屋 TAKEYA", "鶴羽藥妝 Tsuruha"],
        note: "0 手續費不代表到手金額沒有落差：在機場領現金仍可能被收手續費，刷卡退款也可能有匯差。優惠可能調整或提前結束，實際適用門市、退款管道及額外費用依店家公告為準。",
      },
      {
        kind: "tips",
        id: "reminders",
        title: "貼心提醒",
        items: [
          {
            title: "託運前先完成海關確認",
            text: "商品要帶在身邊。行李託運後拿不回來，遇到紅燈就無法出示商品，等於退不了稅。",
          },
          {
            title: "收據、紀錄和商品都留著",
            text: "海關以收據為單位確認，同一張收據少一件，整張都不能退。收據與退稅紀錄請留到退款完成。",
          },
          {
            title: "食品、藥妝別先用掉",
            text: "在日本吃掉、用掉的消耗品不能退稅。已經用掉的話不要操作機台，直接告訴海關人員。",
          },
          {
            title: "轉機看最後一站",
            text: "先搭日本國內線再轉國際線，要在最後離開日本的機場辦理。",
          },
          {
            title: "新制剛上路，提早抵達機場",
            text: "尖峰時段可能要排隊，遇到紅燈還要受檢。海關和航空公司不會為錯過班機負責，時間請抓寬一點。",
          },
          {
            title: "退款問題找店家",
            text: "完成海關確認不等於錢已入帳。退款進度請問購買的店家或退稅業者，海關窗口無法回答。",
          },
        ],
      },
    ],
    video: {
      title: "完整流程，點進影片看",
      text: "Yui 把流程拍成影片了，出發前收藏起來，到機場直接照著做。",
      link: {
        label: "到 Instagram 看影片",
        href: "https://www.instagram.com/reel/DfKJA2NuySC/",
      },
    },
    sources: [
      {
        label: "日本觀光廳：旅客專頁與多語言文宣",
        href: "https://www.mlit.go.jp/kankocho/tax-free/page01_000001_00021.html",
      },
      {
        label: "日本觀光廳：旅客常見問題",
        href: "https://www.mlit.go.jp/kankocho/tax-free/page01_000001_00023.html",
      },
      {
        label: "日本國稅廳：線上辦理海關確認操作指南（繁中）",
        href: "https://www.nta.go.jp/publication/pamph/shohi/menzei/201805/format/002/onlinetetsuzuki/guidetwn.htm",
      },
      {
        label: "日本國稅廳：線上辦理海關確認常見問題（繁中）",
        href: "https://www.nta.go.jp/publication/pamph/shohi/menzei/201805/format/002/onlinetetsuzuki/faqtwn.htm",
      },
      {
        label: "日本海關：離境退稅程序說明",
        href: "https://www.customs.go.jp/kaigairyoko/taxrefund.htm",
      },
      {
        label: "聯合新聞網：退稅新制整理包（2026/10/30）",
        href: "https://udn.com/news/story/6811/9846553",
      },
      {
        label: "NOWnews：Bic Camera、唐吉訶德免手續費（2026/10/8）",
        href: "https://www.nownews.com/news/6881840",
      },
      {
        label: "中時新聞網：唐吉訶德手續費 0 元（2026/10/6）",
        href: "https://www.chinatimes.com/realtimenews/20261006001646-260405",
      },
      {
        label: "Global Blue：友都八喜 11 家門市市區退稅",
        href: "https://news.infoseek.co.jp/article/prtimes_000000027_000022577/",
      },
      {
        label: "Yahoo! 專家評論：市區現金退稅的信用卡擔保機制",
        href: "https://news.yahoo.co.jp/expert/articles/d44adc5fa298e46cda308f71f06fe90d4860453f",
      },
    ],
    disclaimer:
      "本文整理至 2026/10/31。新制剛上路，實際適用門市、退款管道及額外費用依店家公告為準。",
    closing: {
      title: "準備去日本的朋友，這篇先收藏起來。",
      text: "繼續把錢花光、為國爭光。行程還沒排好，也可以交給我們一起想。",
    },
  },
];

export function publishedNews(articles: NewsArticle[] = newsArticles) {
  return [...articles].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function findNewsArticle(slug: string, articles: NewsArticle[] = newsArticles) {
  return articles.find((article) => article.slug === slug);
}

export function newsDateLabel(date: string) {
  return date.replaceAll("-", ".");
}
