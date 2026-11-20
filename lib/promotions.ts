// 首頁的活動彈窗與「現正優惠」卡片都讀這裡。新增活動：在 promotions 加一筆，
// 設好起訖日（台灣時間，含當天），過了 endsAt 就自動下架，不必記得回來刪。
// 同時有好幾檔進行中時，只放排在最前面的一檔。

export type Promotion = {
  /** 換新活動要換 id：關過舊活動彈窗的人，才會再看到新的。 */
  id: string;
  href: string;
  image: string;
  imageAlt: string;
  /** 卡片上方的小標，例如「限時優惠」。 */
  kicker: string;
  title: string;
  text: string;
  cta: string;
  /** YYYY-MM-DD，台灣時間，含當天。 */
  startsAt: string;
  endsAt: string;
  /** 信用卡活動必須揭露的警語。 */
  warning?: string;
};

export const promotions: Promotion[] = [
  {
    id: "esun-card-europe-2026",
    href: "/news/esun-card-europe-2026",
    image: "/news/esun-card-europe-2026.jpg",
    imageAlt:
      "刷玉山卡暢遊歐洲：最熱門團型現折 NT$1,000，活動期間 2026/08/15～2026/12/31。畫面有布達佩斯、瑞士馬特洪峰與芬蘭極光玻璃屋。",
    kicker: "限時優惠",
    title: "刷玉山卡暢遊歐洲，熱門團每人現折 NT$1,000",
    text: "瑞士火車團、芬蘭極光團、巴爾幹半島團，12/31 前報名並刷玉山信用卡付團費就折。",
    cta: "看優惠內容",
    startsAt: "2026-08-15",
    endsAt: "2026-12-31",
    warning: "謹慎理財 信用無價",
  },
];

/** 台灣時間的今天，格式 YYYY-MM-DD。 */
export function taipeiDateKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function activePromotion(now = new Date(), list: Promotion[] = promotions) {
  const today = taipeiDateKey(now);
  return list.find((promotion) => promotion.startsAt <= today && today <= promotion.endsAt);
}

/** 活動最後一天，給畫面顯示用：2026-12-31 → 12/31。 */
export function promotionEndLabel(promotion: Pick<Promotion, "endsAt">) {
  const [, month, day] = promotion.endsAt.split("-");
  return `${Number(month)}/${Number(day)}`;
}
