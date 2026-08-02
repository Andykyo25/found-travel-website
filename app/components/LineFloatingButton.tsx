// 純 CSS position: fixed，不需要 client component 或捲動監聽。
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
      <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <path
          d="M16 5c6.2 0 11.2 4 11.2 9s-5 9-11.2 9c-.7 0-1.4 0-2-.1l-4.7 3a.5.5 0 0 1-.8-.5l.8-3.7C6 20.1 4.8 17.2 4.8 14c0-5 5-9 11.2-9Z"
          fill="currentColor"
        />
        <path
          d="M11.6 11.4v5.2M11.6 16.6h2.6M16.6 11.4v5.2M19.2 11.4v5.2h2.6M19.2 14h2.2M19.2 11.4h2.6"
          fill="none"
          stroke="#06c755"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  );
}
