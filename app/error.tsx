"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="contact-shell">
      <section className="contact-card" role="alert">
        <h1>網站暫時無法載入</h1>
        <p>目前無法確認最新行程資料，請稍後重新嘗試。</p>
        <button className="button" onClick={reset}>
          重新載入
        </button>
      </section>
    </main>
  );
}
