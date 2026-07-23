import type { Destination } from "@/lib/site-content";

export type TravelDestination = {
  id: string;
  label: string;
  city: string;
  timezone: string;
  currency: string;
  latitude: number;
  longitude: number;
  voltage: string;
  frequency: string;
  plugTypes: string;
};

// 前端小工具可選的目的地。電壓、頻率與插頭型式為旅遊參考用途，
// 依各國一般供電標準整理（實際仍以住宿與當地告示為準）。
export const travelDestinations: TravelDestination[] = [
  {
    id: "jp-tokyo",
    label: "日本・東京",
    city: "東京",
    timezone: "Asia/Tokyo",
    currency: "JPY",
    latitude: 35.6762,
    longitude: 139.6503,
    voltage: "100V",
    frequency: "50 / 60Hz",
    plugTypes: "A / B",
  },
  {
    id: "kr-seoul",
    label: "韓國・首爾",
    city: "首爾",
    timezone: "Asia/Seoul",
    currency: "KRW",
    latitude: 37.5665,
    longitude: 126.978,
    voltage: "220V",
    frequency: "60Hz",
    plugTypes: "C / F",
  },
  {
    id: "th-bangkok",
    label: "泰國・曼谷",
    city: "曼谷",
    timezone: "Asia/Bangkok",
    currency: "THB",
    latitude: 13.7563,
    longitude: 100.5018,
    voltage: "220V",
    frequency: "50Hz",
    plugTypes: "A / B / C",
  },
  {
    id: "id-bali",
    label: "印尼・峇里島",
    city: "峇里島",
    timezone: "Asia/Makassar",
    currency: "IDR",
    latitude: -8.4095,
    longitude: 115.1889,
    voltage: "230V",
    frequency: "50Hz",
    plugTypes: "C / F",
  },
  {
    id: "sg-singapore",
    label: "新加坡",
    city: "新加坡",
    timezone: "Asia/Singapore",
    currency: "SGD",
    latitude: 1.3521,
    longitude: 103.8198,
    voltage: "230V",
    frequency: "50Hz",
    plugTypes: "G",
  },
  {
    id: "vn-hcmc",
    label: "越南・胡志明市",
    city: "胡志明市",
    timezone: "Asia/Ho_Chi_Minh",
    currency: "VND",
    latitude: 10.8231,
    longitude: 106.6297,
    voltage: "220V",
    frequency: "50Hz",
    plugTypes: "A / C / F",
  },
  {
    id: "hk-hongkong",
    label: "香港",
    city: "香港",
    timezone: "Asia/Hong_Kong",
    currency: "HKD",
    latitude: 22.3193,
    longitude: 114.1694,
    voltage: "220V",
    frequency: "50Hz",
    plugTypes: "G",
  },
  {
    id: "cn-shanghai",
    label: "中國・上海",
    city: "上海",
    timezone: "Asia/Shanghai",
    currency: "CNY",
    latitude: 31.2304,
    longitude: 121.4737,
    voltage: "220V",
    frequency: "50Hz",
    plugTypes: "A / C / I",
  },
  {
    id: "fr-paris",
    label: "法國・巴黎",
    city: "巴黎",
    timezone: "Europe/Paris",
    currency: "EUR",
    latitude: 48.8566,
    longitude: 2.3522,
    voltage: "230V",
    frequency: "50Hz",
    plugTypes: "C / E",
  },
  {
    id: "gb-london",
    label: "英國・倫敦",
    city: "倫敦",
    timezone: "Europe/London",
    currency: "GBP",
    latitude: 51.5074,
    longitude: -0.1278,
    voltage: "230V",
    frequency: "50Hz",
    plugTypes: "G",
  },
  {
    id: "it-rome",
    label: "義大利・羅馬",
    city: "羅馬",
    timezone: "Europe/Rome",
    currency: "EUR",
    latitude: 41.9028,
    longitude: 12.4964,
    voltage: "230V",
    frequency: "50Hz",
    plugTypes: "C / F / L",
  },
  {
    id: "us-newyork",
    label: "美國・紐約",
    city: "紐約",
    timezone: "America/New_York",
    currency: "USD",
    latitude: 40.7128,
    longitude: -74.006,
    voltage: "120V",
    frequency: "60Hz",
    plugTypes: "A / B",
  },
  {
    id: "au-sydney",
    label: "澳洲・雪梨",
    city: "雪梨",
    timezone: "Australia/Sydney",
    currency: "AUD",
    latitude: -33.8688,
    longitude: 151.2093,
    voltage: "230V",
    frequency: "50Hz",
    plugTypes: "I",
  },
];

// 以後台設定的目的地作為下拉選單的初始選項；找不到對應時退回第一筆。
export function resolveInitialDestinationId(destination: Destination): string {
  const match = travelDestinations.find(
    (option) =>
      option.city === destination.city &&
      option.currency === destination.currency.toUpperCase(),
  );
  return (match ?? travelDestinations[0]).id;
}
