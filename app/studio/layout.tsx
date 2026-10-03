import "./studio.css";

// 後台專用樣式：只在 /studio 底下載入，不影響前台。
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
