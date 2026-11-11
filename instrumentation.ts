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

    // 業務系統的團期每小時同步一次；啟動後一分鐘先跑第一次。沒設定連線資訊就不排程。
    const { isTourFeedConfigured, syncTourFeed } = await import("./lib/tour-feed-sync");
    if (isTourFeedConfigured()) {
      const feedState = globalThis as typeof globalThis & {
        tourFeedTimer?: ReturnType<typeof setInterval>;
      };
      const sync = () => void syncTourFeed().catch((error) => console.error("Tour feed sync failed", error));
      if (!feedState.tourFeedTimer) {
        setTimeout(sync, 60_000).unref();
        feedState.tourFeedTimer = setInterval(sync, 60 * 60_000);
        feedState.tourFeedTimer.unref();
      }
    }
  }
}
