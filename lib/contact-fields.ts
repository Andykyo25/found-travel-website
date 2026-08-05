// 前台表單、後台表格與伺服端驗證共用的聯絡單欄位定義。
// 這個檔案不可加上 "server-only"，client component 也會 import。

export const contactTimeSlots = [
  { id: "anytime", label: "隨時皆可" },
  { id: "morning", label: "早上 10-13" },
  { id: "afternoon", label: "下午 13-18" },
  { id: "evening", label: "晚上 18-22" },
] as const;

export type ContactTimeSlotId = (typeof contactTimeSlots)[number]["id"];

export type ContactRequest = {
  id: string;
  name: string;
  mobile: string;
  preferredTimes: ContactTimeSlotId[];
  message: string;
  createdAt: string;
};

export type ManagedContactRequest = ContactRequest & {
  storageKey: string;
};

export function contactTimeSlotLabel(id: ContactTimeSlotId) {
  return contactTimeSlots.find((slot) => slot.id === id)?.label ?? id;
}
