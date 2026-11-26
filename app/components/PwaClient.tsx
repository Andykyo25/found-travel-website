"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import "./pwa.css";

// 「加到主畫面」相關的前台小功能，掛在 layout，每一頁都有：
// 1. 註冊 service worker（public/sw.js），只在正式建置啟用，開發時不干擾熱更新。
// 2. 沒網路時在頁面頂端提醒：看到的是上次存下的內容，團期與價格以顧問確認為準。
// 3. 逛到第 3 頁後提示可以加到主畫面（iPhone Safari 教操作；Android Chrome 直接給安裝按鈕）。
//    關掉後 30 天內不再出現；已經從主畫面打開的人不會看到。

export const installGuidePath = "/news/add-to-home-screen";
const viewsKey = "found-pwa-views";
const dismissedKey = "found-pwa-hint-dismissed";
const snoozeMs = 30 * 24 * 60 * 60 * 1000;
const minViews = 3;
const hiddenPaths = /^\/(studio|offline)(\/|$)/;

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

// 從主畫面打開時沒有瀏覽器的上一頁按鈕（iPhone 也沒有系統返回鍵），自己補一顆。
function subscribeDisplayMode(callback: () => void) {
  const query = window.matchMedia("(display-mode: standalone)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** iPhone / iPad 的 Safari。LINE、Facebook、Instagram 內建瀏覽器不能加到主畫面，不提示。 */
function isIosSafari() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios && !/Line\/|FBAN|FBAV|Instagram|MicroMessenger|CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
}

function readStorage(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // 無痕模式等情況存不了，就每次都當新訪客。
  }
}

export function PwaClient() {
  const pathname = usePathname();
  const router = useRouter();
  const standalone = useSyncExternalStore(subscribeDisplayMode, isStandalone, () => false);
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const [hint, setHint] = useState<"ios" | "install" | null>(null);
  const installEvent = useRef<InstallPromptEvent | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    const hidden = hiddenPaths.test(pathname);
    const views = Number(readStorage(viewsKey) ?? 0) + (hidden ? 0 : 1);
    writeStorage(viewsKey, String(views));

    const eligible = () => {
      if (hidden || isStandalone()) return false;
      if (Date.now() - Number(readStorage(dismissedKey) ?? 0) < snoozeMs) return false;
      return views >= minViews || pathname === installGuidePath;
    };

    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      installEvent.current = event as InstallPromptEvent;
      if (eligible()) setHint("install");
    };
    const onInstalled = () => setHint(null);
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // 稍等一下再出現，不跟頁面進場動畫搶注意力。
    const timer = window.setTimeout(() => {
      if (!eligible()) setHint(null);
      else if (isIosSafari()) setHint("ios");
      else if (installEvent.current) setHint("install");
    }, 1500);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [pathname]);

  const dismiss = () => {
    writeStorage(dismissedKey, String(Date.now()));
    setHint(null);
  };

  const install = async () => {
    const event = installEvent.current;
    if (!event) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    installEvent.current = null;
    if (outcome === "dismissed") dismiss();
    else setHint(null);
  };

  const goBack = () => {
    // 有上一頁就回上一頁；直接從連結打開（沒有上一頁）就回首頁。
    if (window.history.length > 1) router.back();
    else router.push("/");
  };

  return (
    <>
      {standalone && pathname !== "/" && !hiddenPaths.test(pathname) ? (
        <button type="button" className="pwa-back" onClick={goBack} aria-label="回上一頁">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          返回
        </button>
      ) : null}
      {online ? null : (
        <p className="pwa-offline" role="status">
          目前沒有網路，你看到的是上次瀏覽時存下的內容。團期與價格請以顧問確認為準。
        </p>
      )}
      {hint ? (
        <aside className="pwa-hint" aria-label="加到主畫面">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" width="44" height="44" />
          <div>
            <strong>加到手機主畫面</strong>
            {hint === "ios" ? (
              <p>
                點 Safari 的「分享」
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-label="分享圖示" role="img"><path d="M12 15V3m-4 4 4-4 4 4M7 10H5v11h14V10h-2" /></svg>
                ，再選「加入主畫面」。
                {pathname === installGuidePath ? null : <Link href={installGuidePath}>看圖文教學</Link>}
              </p>
            ) : (
              <p>下次一點就打開，不用另外下載。</p>
            )}
          </div>
          <button type="button" className="pwa-hint-close" onClick={dismiss} aria-label="關閉提示">×</button>
          {hint === "install" ? (
            <button type="button" className="pwa-hint-install" onClick={install}>安裝</button>
          ) : null}
        </aside>
      ) : null}
    </>
  );
}
