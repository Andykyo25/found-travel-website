// VIP 集點制度的內容。規則只有這裡一份：頁面、問答與結構化資料都從這裡取，改制度時只改這個檔。
// 這裡寫的每一條都來自公司公布的 VIP 集點辦法；折扣金額、點數期限等辦法沒寫的事不要自己補。

export const vipPointsPerTrip = { min: 1000, max: 10000 };

export type VipTier = {
  id: string;
  name: string;
  english: string;
  /** 升等需要的累積點數。 */
  points: number;
  /** 享優惠的人數。 */
  guests: string;
  /** VIP 本人要不要一起參團。 */
  mustTravel: boolean;
  description: string;
};

export const vipTiers: VipTier[] = [
  { id: "personal", name: "個人卡", english: "PERSONAL", points: 25000, guests: "VIP 本人 + 1 位親友", mustTravel: true, description: "之後本人參團，可以再帶 1 位親友一起享優惠。" },
  { id: "family", name: "親友卡", english: "FAMILY & FRIENDS", points: 50000, guests: "VIP 本人 + 5 位親友", mustTravel: true, description: "一家人或一群朋友同行，最多 5 位親友一起享優惠。" },
  { id: "unlimited", name: "無限卡", english: "UNLIMITED", points: 100000, guests: "VIP 本人 + 不限人數親友", mustTravel: true, description: "同行的親友不限人數，都能一起享優惠。" },
  { id: "corporate", name: "企業卡", english: "CORPORATE", points: 150000, guests: "不限人數親友", mustTravel: false, description: "VIP 本人不需參團，就可以為不限人數的親友報名享優惠。" },
];

export const vipCorporateNote = "企業卡適用對象如公司行號、里長等，申請資格歡迎私訊詢問。";

/** 以每團點數上限估算，最快幾團可以到這個門檻。 */
export function fastestTrips(points: number) {
  return Math.ceil(points / vipPointsPerTrip.max);
}

const number = (value: number) => value.toLocaleString("en-US");

export const vipSteps = [
  { number: "01", english: "JOIN", title: "參加指定行程", text: "參加指定行程就能累積 VIP 點數。哪些行程可以集點，直接問 Yui 醬。" },
  { number: "02", english: "COLLECT", title: "每團累積點數", text: `每團每人約可累積 ${number(vipPointsPerTrip.min)}～${number(vipPointsPerTrip.max)} 點，依行程而定。` },
  { number: "03", english: "UPGRADE", title: "點數越多，折扣越多", text: `累積到 ${number(vipTiers[0].points)} 點就能升等個人卡。點數越多，會員等級越高，團費折扣也越多。` },
];

export const vipFaqs = [
  {
    question: "找到了旅行社的 VIP 點數怎麼累積？",
    answer: `參加指定行程就能累積 VIP 點數，每團每人約可累積 ${number(vipPointsPerTrip.min)}～${number(vipPointsPerTrip.max)} 點。點數越多，VIP 等級越高，團費折扣也越多。`,
  },
  {
    question: "要累積多少點才能升等？",
    answer: `${vipTiers.map((tier) => `${tier.name} ${number(tier.points)} 點`).join("、")}。以每團最多 ${number(vipPointsPerTrip.max)} 點估算，最快 ${fastestTrips(vipTiers[0].points)} 團可以升等個人卡；實際點數依參加的行程而定。`,
  },
  {
    question: "升等之後可以帶幾位親友一起享優惠？",
    answer: "個人卡是 VIP 本人加 1 位親友，親友卡是本人加 5 位親友，無限卡是本人加不限人數的親友。企業卡可以為不限人數的親友報名享優惠。",
  },
  {
    question: "VIP 本人一定要一起參團嗎？",
    answer: "個人卡、親友卡與無限卡，VIP 本人都需要參團，同行親友才享優惠。企業卡的 VIP 本人不需參團，就可以為親友報名享優惠。",
  },
  {
    question: "企業卡誰可以申請？",
    answer: "企業卡的適用對象如公司行號、里長等，累積 150,000 點可升等。申請資格請私訊詢問。",
  },
  {
    question: "哪些行程可以集點？每個等級折扣多少？",
    answer: "集點適用於指定行程，折扣依會員等級而定，等級越高折扣越多。想知道某個行程能不能集點、目前等級的折扣，請直接用 LINE 問 Yui 醬。",
  },
  {
    question: "怎麼查我現在有幾點？",
    answer: "想知道自己離下一張卡還差幾點，直接用 LINE 找 Yui 醬查詢就可以。",
  },
];
