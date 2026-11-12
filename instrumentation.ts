export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { retryContactNotifications } = await import(
      "./lib/contact-delivery"
    );
    const state = globalThis as typeof globalThis & {
      contactRetryTimer?: ReturnType<typeof setInterval>;
    };
    state.contactRetryTimer ??= setInterval(() => {
      void retryContactNotifications().catch((error) =>
        console.error("Contact retry worker unavailable", error),
      );
    }, 60_000);
    state.contactRetryTimer.unref();

    // 一次性的行程摘要改寫：啟動後 20 秒跑一次，沒有要改的就什麼也不做。
    const once = globalThis as typeof globalThis & { summaryRewriteStarted?: boolean };
    if (!once.summaryRewriteStarted) {
      once.summaryRewriteStarted = true;
      setTimeout(() => {
        void import("./lib/summary-rewrite-run")
          .then(({ runSummaryRewrites }) => runSummaryRewrites())
          .then((changed) => {
            if (changed > 0) console.log(`Rewrote ${changed} duplicated trip summaries`);
          })
          .catch((error) => console.error("Summary rewrite failed", error));
      }, 20_000).unref();
    }

    // 業務系統的團期每 3 小時同步一次；啟動後一分鐘先跑第一次。沒設定連線資訊就不排程。
    const { isTourFeedConfigured, syncTourFeed } = await import("./lib/tour-feed-sync");
    if (isTourFeedConfigured()) {
      const feedState = globalThis as typeof globalThis & {
        tourFeedTimer?: ReturnType<typeof setInterval>;
      };
      const sync = () => void syncTourFeed().catch((error) => console.error("Tour feed sync failed", error));
      if (!feedState.tourFeedTimer) {
        setTimeout(sync, 60_000).unref();
        feedState.tourFeedTimer = setInterval(sync, 3 * 60 * 60_000);
        feedState.tourFeedTimer.unref();
      }
    }
  }
}
