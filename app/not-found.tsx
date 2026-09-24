import Link from "next/link";

export default function NotFound() {
  return (
    <main className="dates-shell public-page">
      <header className="dates-header"><Link className="brand" href="/">找到了旅行社</Link></header>
      <section className="dates-card">
        <p className="eyebrow"><span />PAGE NOT FOUND · 404</p>
        <h1>這一頁，暫時找不到。</h1>
        <p>連結可能已變更，或目前沒有這個月份的團期。可以回到首頁，或看看其他出發日期。</p>
        <div className="dates-actions">
          <Link className="button" href="/dates">查看出發團期</Link>
          <Link className="button button-secondary" href="/">回到首頁</Link>
        </div>
      </section>
    </main>
  );
}
