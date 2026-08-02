// 純 CSS position: fixed，不需要 client component 或捲動監聽。
// 圖示為 LINE 官方 brand icon，四角透明，因此陰影用 drop-shadow 而非 box-shadow。
export function LineFloatingButton({ lineUrl }: { lineUrl: string }) {
  return (
    <a
      className="line-fab"
      href={lineUrl}
      target="_blank"
      rel="noreferrer"
      aria-label="透過 LINE 聯絡顧問"
      title="LINE 聯絡顧問"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/line-icon.png"
        alt=""
        width={1001}
        height={1000}
        decoding="async"
      />
    </a>
  );
}
