import "server-only";

// 後台設定的 LINE 連結通常是短網址（lin.ee/…），要預填訊息得知道官方帳號 ID（@xxxx）。
// 第一次用到時跟著短網址的轉址查一次，之後記在記憶體；查不到就回傳 null，按鈕維持原本的連結。
const cache = new Map<string, Promise<string | null>>();

export function lineAccountIdFromUrl(url: string): string | null {
  const match = url.match(/^https:\/\/line\.me\/R\/ti\/p\/(?:%40|@)([A-Za-z0-9._-]+)/);
  return match ? `@${match[1]}` : null;
}

export function lineAccountId(lineUrl: string): Promise<string | null> {
  const direct = lineAccountIdFromUrl(lineUrl);
  if (direct) return Promise.resolve(direct);
  if (!/^https:\/\/lin\.ee\/[A-Za-z0-9]+$/.test(lineUrl)) return Promise.resolve(null);
  let pending = cache.get(lineUrl);
  if (!pending) {
    pending = fetch(lineUrl, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(3000) })
      .then((response) => lineAccountIdFromUrl(response.headers.get("location") ?? ""))
      .catch(() => null)
      .then((id) => {
        // 查不到不要永久記住，下次再試。
        if (!id) cache.delete(lineUrl);
        return id;
      });
    cache.set(lineUrl, pending);
  }
  return pending;
}
