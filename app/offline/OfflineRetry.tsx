"use client";

export function OfflineRetry() {
  return (
    <button type="button" className="fh-btn fh-btn-light" onClick={() => window.location.reload()}>
      重新整理 ↻
    </button>
  );
}
