// 目的地分組：後台的「地區」是自由填寫的文字（東京、東北・藏王、日本的山形縣…），
// 旅客想的卻是「去日本」。這裡只看地區欄位裡的地名，把它歸到一個大方向；
// 認不得的歸「其他」，不會因此找不到，只是不在大方向底下。
// 「四國」前面是洲名時是「四個國家」（北歐四國），不是日本的四國。
// 順序有意義：郵輪先判定（地中海郵輪不算歐洲陸地團），也用來排列選項。
const groups: [string, RegExp][] = [
  ["郵輪", /郵輪|河輪/],
  ["日本", /日本|北海道|東京|東北|藏王|富士|立山|黑部|越後|長野|北陸|名古屋|大阪|京都|關西|(?<![歐亞美非])四國|山陰|山陽|九州|沖繩|沖縄/],
  ["韓國", /韓國|首爾|釜山|濟州|大邱|慶州/],
  ["越南", /越南|北越|中越|南越|下龍|河內|峴港|富國島|胡志明/],
  ["東南亞・海島", /泰國|曼谷|清邁|普吉|馬來西亞|吉隆坡|新加坡|檳城|沙巴|汶萊|古晉|印尼|泗水|日惹|峇里島|巴厘島|菲律賓|宿霧|薄荷島|長灘|帛琉|關島|馬爾地夫/],
  ["歐洲", /歐洲|東歐|西歐|南歐|北歐|中歐|布拉格|prague|挪威|芬蘭|冰島|瑞典|丹麥|奧地利|捷克|匈牙利|波蘭|波羅的海|克羅埃西亞|斯洛維尼亞|巴爾幹|希臘|義大利|北義|瑞士|德國|法國|南法|荷比|荷蘭|比利時|英國|愛爾蘭|西班牙|葡萄牙|地中海/i],
  ["美洲", /美國|美西|美東|加拿大|夏威夷|阿拉斯加|祕魯|秘魯|墨西哥|南美/],
  ["紐澳", /澳洲|雪梨|墨爾本|紐西蘭/],
  ["中東・非洲", /土耳其|埃及|杜拜|以色列|約旦|摩洛哥|肯亞|南非|非洲/],
];

export const otherDestinationGroup = "其他";
export const destinationGroupNames = [...groups.map(([name]) => name), otherDestinationGroup];

export function destinationGroup(region: string) {
  const text = region.replaceAll("臺", "台");
  return groups.find(([, places]) => places.test(text))?.[0] ?? otherDestinationGroup;
}

// 後台分類（目的地頁用的那一套）對到這裡的大方向。後台把歐洲分成五區、東南亞和海島分開，
// 旅客在「幫我找旅行」第一步只需要選大方向，所以在這裡收攏。
const categoryGroups: Record<string, string> = {
  日本: "日本", 韓國: "韓國", 越南: "越南", 郵輪: "郵輪",
  東南亞: "東南亞・海島", 海島: "東南亞・海島",
  東歐: "歐洲", 西歐: "歐洲", 南歐: "歐洲", 北歐: "歐洲", 中歐: "歐洲", 歐洲: "歐洲",
  美洲: "美洲", 紐澳: "紐澳", 中東非洲: "中東・非洲",
};

/**
 * 行程屬於哪個大方向。以業務在後台選的分類為準，和目的地頁同一個來源；
 * 分類沒填或是沒見過的新分類，才退回去從分類名稱、地區文字裡的地名判斷。
 */
export function tripDestinationGroup(trip: { badge?: string; region: string }) {
  const category = (trip.badge ?? "").trim().replace(/[・\s]/g, "");
  if (category) {
    const known = categoryGroups[category];
    if (known) return known;
    const guessed = destinationGroup(category);
    if (guessed !== otherDestinationGroup) return guessed;
  }
  return destinationGroup(trip.region);
}
