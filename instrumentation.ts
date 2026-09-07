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
  }
}
