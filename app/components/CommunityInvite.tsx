// LINE 社群（OpenChat）入口。官方帳號是「一對一找顧問」，社群是「收消息、看情報」，
// 所以外觀刻意和官方帳號的珊瑚色實心按鈕不同：森林綠外框、群組圖示、強調可匿名。
// 網址留空時整個入口不顯示。

function CommunityIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8" />
      <circle cx="16.5" cy="9.5" r="2.4" />
      <path d="M15.6 14.4c2.4-.3 4.4 1.2 4.9 3.9" />
    </svg>
  );
}

const defaultTitle = "吃喝玩樂Yui醬帶你周遊列國";
const defaultText = "新團期、剩餘名額與早鳥優惠，社群第一時間公布；也有出團花絮與當地小情報。";

export function CommunityInvite({
  url,
  title = defaultTitle,
  text = defaultText,
  tone = "light",
}: {
  url: string;
  title?: string;
  text?: string;
  tone?: "light" | "dark";
}) {
  if (!url) return null;
  return (
    <aside className={`community-invite community-invite-${tone}`} aria-label="LINE 社群">
      <span className="community-invite-icon"><CommunityIcon /></span>
      <div className="community-invite-copy">
        <p className="community-invite-kicker">LINE 社群</p>
        <h2>{title}</h2>
        <p>{text}</p>
        <ul className="community-invite-tags">
          <li>匿名加入</li>
          <li>可以只看不說話</li>
          <li>不用加好友</li>
        </ul>
      </div>
      <div className="community-invite-action">
        <a className="community-button" href={url} target="_blank" rel="noopener noreferrer">
          加入社群 <span aria-hidden="true">↗</span>
        </a>
        <small>要報名或問自己的行程，請用「LINE 聯絡顧問」</small>
      </div>
    </aside>
  );
}

// 行內版：放在團期說明旁邊的一行字。
export function CommunityInline({ url, text }: { url: string; text: string }) {
  if (!url) return null;
  return (
    <p className="community-inline">
      <CommunityIcon />
      <span>{text}</span>
      <a href={url} target="_blank" rel="noopener noreferrer">
        加入 LINE 社群 <span aria-hidden="true">↗</span>
      </a>
    </p>
  );
}

// 頁尾版：和官方 LINE、Instagram 分開一行。
export function CommunityFooterLink({ url }: { url: string }) {
  if (!url) return null;
  return (
    <a className="community-footer-link" href={url} target="_blank" rel="noopener noreferrer">
      <CommunityIcon />
      LINE 社群・吃喝玩樂Yui醬 <span aria-hidden="true">↗</span>
    </a>
  );
}
