// 找到了旅行社：service worker（讓網站可以加到主畫面，並在網路不穩時打開看過的頁面）。
//
// 原則：團期與價格一定要是最新的，所以頁面「網路優先」——有網路就每次向伺服器拿，
// 只有連不上時才拿上次看過的那一份（頁面上會顯示離線提示）。
// 後台（/studio）與 API 完全不經過這裡。
//
// 改了快取規則就把 VERSION 加一，舊的快取會在新版啟用時清掉。
const VERSION = "v2";
// SHELL：離線頁和它需要的檔案，安裝時存好、不會被清掉。其他三個有數量上限。
const SHELL = `found-shell-${VERSION}`;
const PAGES = `found-pages-${VERSION}`;
const ASSETS = `found-assets-${VERSION}`;
const IMAGES = `found-images-${VERSION}`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/brand/logo-mark.png"];

const limits = { [PAGES]: 40, [ASSETS]: 160, [IMAGES]: 80 };
const currentCaches = [SHELL, PAGES, ASSETS, IMAGES];
const isPrivate = (pathname) => /^\/(studio|api)(\/|$)/.test(pathname);

/** 離線頁的 JS / CSS 也要先存，否則沒網路時畫面載不起來。 */
async function precacheShell() {
  const cache = await caches.open(SHELL);
  await cache.addAll(PRECACHE);
  const html = await (await cache.match(OFFLINE_URL)).text();
  const assets = new Set([...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)].map((match) => match[1]));
  await Promise.all([...assets].map((url) => cache.add(url).catch(() => undefined)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("found-") && !currentCaches.includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

/** 超過上限就從最早存的開始刪，避免快取一直長大。 */
async function trim(cacheName) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  const extra = keys.length - limits[cacheName];
  for (let i = 0; i < extra; i += 1) await cache.delete(keys[i]);
}

async function store(cacheName, request, response) {
  if (!response || response.status !== 200 || response.type !== "basic") return;
  const cache = await caches.open(cacheName);
  await cache.put(request, response);
  await trim(cacheName);
}

async function networkFirstPage(event) {
  const { request } = event;
  try {
    // 每次都向伺服器確認（cache: "no-cache"）：瀏覽器自己的 HTTP 快取可能還留著幾小時前的舊頁面，
    // 業務改了團期或網站更新後，客人會看到舊的。navigate 請求不能直接加選項，所以用網址重新發一次。
    const response = await fetch(request.url, { cache: "no-cache", credentials: "same-origin" });
    // 被轉址（例如舊的行程網址、www）：讓瀏覽器自己轉過去，網址列才會是新網址；這種不存。
    if (response.redirected) return Response.redirect(response.url, 302);
    event.waitUntil(store(PAGES, request, response.clone()));
    return response;
  } catch {
    const cached = await caches.match(request, { cacheName: PAGES });
    return cached ?? (await caches.match(OFFLINE_URL, { cacheName: SHELL })) ?? Response.error();
  }
}

// /_next/static 的檔名含內容雜湊，同一個網址內容不會變，有就直接用。
async function cacheFirst(event, cacheName) {
  // 不限定快取名稱：離線頁的檔案存在 SHELL 裡。
  const cached = await caches.match(event.request);
  if (cached) return cached;
  const response = await fetch(event.request);
  event.waitUntil(store(cacheName, event.request, response.clone()));
  return response;
}

// 照片先給手上那份，背景再更新。
async function staleWhileRevalidate(event, cacheName) {
  const cached = await caches.match(event.request, { cacheName });
  const update = fetch(event.request).then((response) => {
    event.waitUntil(store(cacheName, event.request, response.clone()));
    return response;
  });
  if (cached) {
    event.waitUntil(update.catch(() => undefined));
    return cached;
  }
  return update;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || isPrivate(url.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(event));
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(event, ASSETS));
  } else if (request.destination === "image" || url.pathname.startsWith("/_next/image")) {
    event.respondWith(staleWhileRevalidate(event, IMAGES));
  }
});
