import "server-only";

import {
  contactTimeSlotLabel,
  type ContactRequest,
} from "@/lib/contact-fields";

const notifyTimeoutMs = 8000;

// 訊息格式比照業務群組現有的諮詢單通知。
export function formatContactRequestMessage(
  request: ContactRequest,
  brandName: string,
) {
  const receivedAt = new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(request.createdAt));

  return [
    `【${brandName}】網頁諮詢單`,
    "",
    "📋 顧客聯絡表單",
    `聯絡人：${request.name}`,
    `行動電話：${request.mobile}`,
    `希望聯繫時段：${request.preferredTimes
      .map(contactTimeSlotLabel)
      .join("、")}`,
    `填寫時間：${receivedAt}`,
    "",
    "📝 訊息內容",
    request.message,
    "",
    "🚨 此為系統自動發送，請勿回覆，謝謝！",
  ].join("\n");
}

async function pushLineMessage(text: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  const to = process.env.LINE_TARGET_ID?.trim();
  if (!token || !to) return false;

  const response = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ to, messages: [{ type: "text", text }] }),
    signal: AbortSignal.timeout(notifyTimeoutMs),
  });

  if (!response.ok) {
    throw new Error(
      `LINE push failed: ${response.status} ${await response.text()}`,
    );
  }
  return true;
}

async function postWebhook(request: ContactRequest, text: string) {
  const url = process.env.CONTACT_WEBHOOK_URL?.trim();
  if (!url) return false;

  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text,
      name: request.name,
      mobile: request.mobile,
      preferredTimes: request.preferredTimes.map(contactTimeSlotLabel),
      message: request.message,
      createdAt: request.createdAt,
    }),
    signal: AbortSignal.timeout(notifyTimeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Contact webhook failed: ${response.status}`);
  }
  return true;
}

export function isContactNotifyConfigured() {
  return Boolean(
    (process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim() &&
      process.env.LINE_TARGET_ID?.trim()) ||
      process.env.CONTACT_WEBHOOK_URL?.trim(),
  );
}

// 通知失敗不影響客人送出結果，表單本身已經存進 Bucket。
export async function notifyContactRequest(
  request: ContactRequest,
  brandName: string,
) {
  const text = formatContactRequestMessage(request, brandName);

  const results = await Promise.allSettled([
    pushLineMessage(text),
    postWebhook(request, text),
  ]);

  let delivered = false;
  for (const result of results) {
    if (result.status === "fulfilled") delivered ||= result.value;
    else console.error("Unable to send contact notification", result.reason);
  }

  if (!delivered && isContactNotifyConfigured()) {
    console.error("Contact notification was configured but not delivered");
  }
  return delivered;
}
