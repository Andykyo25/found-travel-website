import { createHmac, timingSafeEqual } from "node:crypto";

// LINE 以 Channel secret 對原始 body 做 HMAC-SHA256（base64）放在 x-line-signature。
export function verifyLineSignature(
  rawBody: string,
  signature: string | null,
  channelSecret: string,
) {
  if (!signature || !channelSecret) return false;
  const expected = createHmac("sha256", channelSecret)
    .update(rawBody)
    .digest();
  let received: Buffer;
  try {
    received = Buffer.from(signature, "base64");
  } catch {
    return false;
  }
  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
}

// 只取出可當推播對象的 ID（群組、多人聊天室），不碰訊息內容。
export function pushTargetsFromEvents(body: unknown) {
  const events =
    typeof body === "object" && body !== null && Array.isArray((body as { events?: unknown }).events)
      ? ((body as { events: unknown[] }).events)
      : [];
  const targets = new Set<string>();
  for (const event of events) {
    const source = (event as { source?: { type?: unknown; groupId?: unknown; roomId?: unknown } })?.source;
    if (source?.type === "group" && typeof source.groupId === "string")
      targets.add(`group ${source.groupId}`);
    if (source?.type === "room" && typeof source.roomId === "string")
      targets.add(`room ${source.roomId}`);
  }
  return [...targets];
}
