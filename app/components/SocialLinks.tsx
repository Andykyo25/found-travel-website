import { instagramUrl } from "@/lib/structured-data";

export { instagramUrl };
// 關係網站「東京日記」：西日暮里民宿與東京包車，獨立部署在子網域。
export const tokyoNikkiUrl = "https://tokyonikki.tabiyoi.com/";
// Facebook 粉專「Tabiyoi 旅好時光」（分享短網址解開後的正式網址，不帶追蹤參數）。
export const facebookUrl = "https://www.facebook.com/profile.php?id=61596819122408";

// 圖示都用 1.5 線寬、currentColor，隨標頭與頁尾的文字色變化。
function LineIcon() {
  return (
    <svg viewBox="-1 -1 26 26" fill="currentColor" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314z" />
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.2" cy="6.8" r="0.4" fill="currentColor" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9.25" />
      <path d="M13.2 21.2v-7.4h2.4l.4-2.8h-2.8V9.3c0-.8.3-1.4 1.4-1.4H16V5.4c-.3 0-1.1-.1-2-.1-2 0-3.4 1.2-3.4 3.5V11H8.2v2.8h2.4v7.4" />
    </svg>
  );
}

// 標頭只放圖示，頁尾加上文字（labels）。
export function SocialLinks({ lineUrl, labels = false, className = "" }: { lineUrl: string; labels?: boolean; className?: string }) {
  return (
    <div className={`site-social${className ? ` ${className}` : ""}`}>
      <a href={lineUrl} target="_blank" rel="noopener noreferrer" aria-label="LINE 找 Yui 聊旅行" title="LINE">
        <LineIcon />
        {labels ? "LINE" : null}
      </a>
      <a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="前往 Instagram" title="Instagram">
        <InstagramIcon />
        {labels ? "Instagram" : null}
      </a>
      <a href={facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="前往 Facebook 粉絲專頁" title="Facebook">
        <FacebookIcon />
        {labels ? "Facebook" : null}
      </a>
    </div>
  );
}
