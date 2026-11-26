// 最新消息的內容都放在這裡。新增一則消息：在 newsArticles 加一筆資料，
// 列表、內頁、網站地圖都會自動帶出，不需要另外新增頁面。
// 涉及規定或費用的內容請附上 sources，並更新 publishedAt 或 updatedAt。

export type NewsLink = { label: string; href: string };

export type NewsMethod = {
  name: string;
  badge?: string;
  audience: string;
  steps: string[];
  note?: string;
  link?: NewsLink;
};

/** 文章裡介紹的團型：照片、天數與起價直接讀本站行程（trips 填行程網址代稱），行程下架就自動不顯示。 */
export type NewsRoute = {
  name: string;
  area: string;
  offer: string;
  text: string;
  highlights: string[];
  trips: string[];
};

type NewsSection = { id: string; title: string };

export type NewsBlock = NewsSection &
  (
    | { kind: "text"; paragraphs: string[] }
    | { kind: "facts"; items: { label: string; value: string; note: string }[] }
    | {
        kind: "compare";
        columns: [string, string];
        rows: { label: string; before: string; after: string }[];
      }
    | { kind: "methods"; lede: string; items: NewsMethod[] }
    | { kind: "names"; lede: string; items: string[]; note: string }
    | { kind: "tips"; items: { title: string; text: string }[] }
    | { kind: "routes"; lede: string; items: NewsRoute[] }
  );

export type NewsArticle = {
  slug: string;
  title: string;
  /** 麵包屑用的短標題。 */
  shortTitle: string;
  category: string;
  /** YYYY-MM-DD，列表依此由新到舊排序。 */
  publishedAt: string;
  updatedAt?: string;
  author?: string;
  summary: string;
  image: string;
  imageAlt: string;
  /** 圖片本身含文字（4:5 圖卡）：完整顯示，不裁切也不加取景框。 */
  imagePoster?: boolean;
  /** 圖片本身含文字的橫幅（約 16:9 活動主視覺）：完整顯示，內頁放在標題下方滿版。 */
  imageBanner?: boolean;
  blocks: NewsBlock[];
  video?: { title: string; text: string; link: NewsLink };
  sources: NewsLink[];
  disclaimer?: string;
  closing?: { title: string; text: string };
};

export const newsArticles: NewsArticle[] = [
  {
    slug: "starlux-sydney-auckland",
    title: "星宇航空 2027/3/23 首航雪梨、奧克蘭：澳洲 8 日、紐西蘭 12 天新行程登場",
    shortTitle: "星宇飛雪梨、奧克蘭",
    category: "新航線・新行程",
    publishedAt: "2026-11-26",
    author: "Yui",
    summary:
      "星宇航空第一條大洋洲航線來了：2027 年 3 月 23 日首航桃園－雪梨－奧克蘭。我們也同步推出兩條搭星宇的新行程：雪梨・黃金海岸精彩雙城 8 日，以及紐西蘭南北島精彩 12 天。航班時間、行程亮點、入境要準備什麼，這篇一次看。",
    image: "/news/starlux-sydney-auckland.jpg",
    imageAlt: "從空中看雪梨港：前方是白色帆形屋頂的雪梨歌劇院，後方是雪梨港灣大橋與市區高樓。",
    blocks: [
      {
        kind: "facts",
        id: "key-facts",
        title: "先看重點",
        items: [
          { label: "首航日期", value: "2027/3/23", note: "航線是桃園－雪梨－奧克蘭，從台灣直飛雪梨，再延伸到紐西蘭奧克蘭。" },
          { label: "班次", value: "每週 4 班", note: "開航初期每週 4 班，2027 年 5 月 1 日起增加為每天 1 班。" },
          { label: "機型", value: "A330-900", note: "星宇的中長程主力機型。" },
        ],
      },
      {
        kind: "compare",
        id: "schedule",
        title: "航班時間",
        columns: ["去程 JX183", "回程 JX184"],
        rows: [
          { label: "桃園－雪梨", before: "桃園 19:40 起飛，隔天 08:10 抵達雪梨", after: "雪梨 21:35 起飛，隔天 04:05 抵達桃園" },
          { label: "雪梨－奧克蘭", before: "雪梨 11:05 起飛，16:10 抵達奧克蘭", after: "奧克蘭 18:35 起飛，20:05 抵達雪梨" },
          { label: "怎麼飛", before: "晚上出發、睡一覺就到雪梨", after: "半夜回到台灣，隔天可以休息" },
        ],
      },
      {
        kind: "routes",
        id: "routes",
        title: "搭星宇的兩條新行程",
        lede: "兩條行程都搭星宇航空。出發日期與團費依想出發的月份與人數回覆，點進去看每日行程，有興趣直接問顧問。",
        items: [
          {
            name: "雪梨・黃金海岸精彩雙城 8 日",
            area: "澳洲",
            offer: "星宇直飛雪梨",
            text: "雪梨進出，再搭澳洲國內線到黃金海岸。天堂鄉農莊看剪羊毛秀、和無尾熊合照，去藍藤酒莊品酒、逛布里斯本，回到雪梨搭藍山的礦坑纜車和景觀纜車，最後走過歌劇院、港灣大橋與岩石區。",
            highlights: ["雪梨歌劇院", "藍山國家公園", "黃金海岸", "無尾熊合照"],
            trips: ["sydney-gold-coast-highlights-8d"],
          },
          {
            name: "紐西蘭南北島精彩 12 天",
            area: "紐西蘭",
            offer: "經雪梨飛奧克蘭",
            text: "南島沿著 8 號觀景公路看蒂卡波湖、好牧羊人教堂和庫克山，在皇后鎮搭天際纜車吃晚餐，坐船進米佛峽灣、看蒂阿瑙螢火蟲洞；再到北島羅吐魯阿認識毛利文化，最後逛奧克蘭和 Devonport 小鎮。",
            highlights: ["米佛峽灣", "蒂卡波湖", "皇后鎮", "毛利文化"],
            trips: ["new-zealand-north-south-highlights-12d"],
          },
        ],
      },
      {
        kind: "tips",
        id: "tips",
        title: "去澳紐前，先準備好這些",
        items: [
          { title: "澳洲要辦 ETA", text: "台灣護照去澳洲觀光要先申請電子旅行許可（ETA），用澳洲政府官方的「Australia ETA」App 申請，需要感應晶片護照和自拍。" },
          { title: "紐西蘭要辦 NZeTA", text: "台灣護照去紐西蘭觀光免簽，但要先申請 NZeTA，建議出發前至少兩週辦好；起飛前 24 小時內，還要線上填紐西蘭旅客申報（NZTD）。" },
          { title: "食物別亂帶", text: "澳洲、紐西蘭的檢疫都很嚴格，新鮮蔬果、肉類、蛋奶製品不能帶，帶了食品或藥品一定要申報，不確定就申報。" },
          { title: "季節和台灣相反", text: "南半球的 3 到 5 月是秋天，早晚溫差大，特別是紐西蘭南島，外套要帶夠。" },
          { title: "班機時間以最終公告為準", text: "新航線的時刻表可能還會調整，實際航班與景點順序，以星宇航空公告和出發前說明會資料為準。" },
        ],
      },
    ],
    sources: [
      { label: "中時新聞網：星宇「台北－雪梨－奧克蘭」開賣（2026/11/17）", href: "https://www.chinatimes.com/realtimenews/20261117001975-260405" },
      { label: "鏡週刊：星宇航空雪梨、奧克蘭雙航點開賣（2026/11/17）", href: "https://www.mirrormedia.mg/story/20261117tour001" },
      { label: "澳洲內政部：電子旅行許可 ETA", href: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/electronic-travel-authority-601" },
      { label: "紐西蘭移民局：NZeTA", href: "https://www.immigration.govt.nz/new-zealand-visas/visas/visa/nzeta" },
      { label: "紐西蘭旅客申報 NZTD", href: "https://www.travellerdeclaration.govt.nz/" },
    ],
    disclaimer: "本文整理至 2026/11/26。航班時刻、機型與班次以星宇航空最終公告為準；入境規定以各國官方公告為準。",
    closing: {
      title: "南半球的第一趟，交給我們安排。",
      text: "想去澳洲還是紐西蘭、哪個月出發、幾個人，跟顧問說一聲，我們幫你查出得了的團期與團費。",
    },
  },
  {
    slug: "korea-k-eta-2027",
    title: "韓國 K-ETA 免申請延長到 2027 年底：台灣人去韓國還要準備什麼",
    shortTitle: "韓國 K-ETA 延長",
    category: "韓國旅遊須知",
    publishedAt: "2026-11-26",
    author: "Yui",
    summary:
      "韓國法務部 11/23 公告：K-ETA 暫時免申請再延長一年，到 2027/12/31。台灣護照去韓國觀光，明年一樣不用申請 K-ETA，但每個人都要記得填電子入境卡。跨年、春節要去韓國的朋友，看這篇就夠了。",
    image: "/news/korea-k-eta-2027.jpg",
    imageAlt: "仁川國際機場的登機門候機區：整面落地玻璃窗，陽光照在一排排座椅上。",
    blocks: [
      {
        kind: "facts",
        id: "key-facts",
        title: "先看重點",
        items: [
          {
            label: "K-ETA 免申請到",
            value: "2027/12/31",
            note: "韓國時間。2027/1/1 到 12/31 這段期間，原本就免申請的國家與地區（包含台灣）繼續免申請。",
          },
          {
            label: "電子入境卡",
            value: "抵達前 3 天",
            note: "沒有 K-ETA 的人要填。抵達前 3 天（韓國時間）起就能線上填寫，免費。",
          },
          {
            label: "想自己申請 K-ETA",
            value: "₩10,000",
            note: "免申請的人也可以自費申請，好處是入境不用再填入境卡，效期 3 年。",
          },
        ],
      },
      {
        kind: "compare",
        id: "keta-or-card",
        title: "要申請 K-ETA，還是填入境卡就好？",
        columns: ["不申請 K-ETA（多數人）", "自己申請 K-ETA"],
        rows: [
          { label: "費用", before: "免費", after: "1 萬韓元" },
          { label: "入境前要做的事", before: "每次去都要填電子入境卡", after: "核准後效期內不用再填入境卡" },
          { label: "適合誰", before: "一年去韓國一兩次", after: "常跑韓國、不想每次填表的人" },
        ],
      },
      {
        kind: "methods",
        id: "how-to",
        title: "兩種做法，選一種就好",
        lede: "去韓國觀光，台灣護照不用簽證。明年出發的朋友只要從下面兩種做法選一種：大多數人填電子入境卡就好。",
        items: [
          {
            name: "電子入境卡",
            badge: "大多數人",
            audience: "一年去一兩次、不想多花錢的人",
            steps: [
              "抵達韓國前 3 天內（韓國時間），打開韓國官方的電子入境卡網站",
              "填護照資料、航班、在韓國的住宿地址",
              "送出後收到確認，入境時出示護照就好",
              "送出後 3 天內沒有入境，要重新填一次",
            ],
            note: "跟團的朋友也是每個人各填一張。住宿地址不知道怎麼寫，出發前問顧問就好。",
            link: { label: "韓國電子入境卡官方網站", href: "https://www.e-arrivalcard.go.kr/" },
          },
          {
            name: "自己申請 K-ETA",
            audience: "常跑韓國的人",
            steps: [
              "到 K-ETA 官方網站申請，建議出發前至少 72 小時送出",
              "上傳護照與大頭照，線上付 1 萬韓元",
              "核准後效期 3 年，期間內入境都不用再填入境卡",
            ],
            note: "以前申請過、還在效期內的 K-ETA 可以繼續用，已付的費用不會退。",
            link: { label: "K-ETA 官方網站", href: "https://www.k-eta.go.kr/" },
          },
        ],
      },
      {
        kind: "tips",
        id: "tips",
        title: "出發前再提醒",
        items: [
          {
            title: "只認官方網站",
            text: "搜尋「韓國入境卡」「K-ETA」會跑出不少代辦網站，有的會另外收手續費。電子入境卡本來就是免費的，認明 go.kr 結尾的官方網址。",
          },
          {
            title: "今年底以前入境一樣免申請",
            text: "這次延長是接在原本的期限後面，2026 年跨年前出發的朋友，同樣不用申請 K-ETA，填入境卡就好。",
          },
          {
            title: "規定以出發當時為準",
            text: "免申請是韓國的暫時措施，每年都可能調整。出發前我們會再幫你確認一次最新公告。",
          },
        ],
      },
      {
        kind: "routes",
        id: "routes",
        title: "冬天去韓國，這幾團正適合",
        lede: "跨年、春節想去韓國，可以先從這幾種團型挑。點進去看每日行程與出發日，連假團位比較搶手，有興趣早點跟顧問說。",
        items: [
          {
            name: "冬季限定玩法",
            area: "首爾・釜山",
            offer: "冬季限定",
            text: "冬天才有的玩法：冰柱節、冰上釣魚，或是到滑雪場玩一整天。",
            highlights: ["冰柱節", "冰釣", "滑雪"],
            trips: ["seoul-ice-festival-5d", "seoul-ice-fishing-5d", "seoul-ski-5d", "busan-ski-5d"],
          },
          {
            name: "釜山與慶州",
            area: "釜山",
            offer: "第一次去也適合",
            text: "釜山看海、逛市場，再到古都慶州走一走，節奏輕鬆，帶長輩也合適。",
            highlights: ["海景", "慶州古都", "市場美食"],
            trips: ["busan-gyeongju-daegu-5d", "busan-gyeongju-daegu-6d"],
          },
          {
            name: "濟州島",
            area: "濟州",
            offer: "度假型",
            text: "想放慢一點，就去濟州：看海岸風景、步調悠閒，冬天也有自己的味道。",
            highlights: ["海岸風景", "慢步調"],
            trips: ["jeju-landing-resort-5d", "jeju-special-5d"],
          },
        ],
      },
    ],
    sources: [
      {
        label: "K-ETA 官方網站：暫時免申請延長公告（2026/11/23）",
        href: "https://www.k-eta.go.kr/portal/board/viewboarddetail.do?bbsSn=332884",
      },
      { label: "韓國電子入境卡官方網站", href: "https://www.e-arrivalcard.go.kr/" },
      {
        label: "韓國出入境外國人政策本部：電子入境卡說明",
        href: "https://www.immigration.go.kr/bbs/immigration/223/593810/artclView.do",
      },
      {
        label: "EY：韓國 2026 年起外國人入境改用電子入境卡",
        href: "https://globaltaxnews.ey.com/news/2025-2474-republic-of-korea-mandates-e-arrival-card-for-all-foreign-nationals-effective-1-january-2026",
      },
      {
        label: "TRAICY：K-ETA 免申請延長至 2027 年底（2026/11/23）",
        href: "https://en.traicy.com/posts/2026112342616/",
      },
    ],
    disclaimer: "本文整理至 2026/11/26。入境規定以韓國官方公告為準，出發前請再確認。",
    closing: {
      title: "入境的事交給我們確認，你只要想好去哪玩。",
      text: "跨年、春節的韓國團都在陸續開，想去哪裡、幾個人去，直接問顧問就好。",
    },
  },
  {
    // 步驟對應 app/manifest.ts、public/sw.js 與 app/components/PwaClient.tsx 的實際行為；改了那邊記得回來對一下。
    slug: "add-to-home-screen",
    title: "把找到了加到手機主畫面，下次一點就打開",
    shortTitle: "加到主畫面教學",
    category: "網站使用教學",
    publishedAt: "2026-11-24",
    summary:
      "常來看行程、查團期的朋友，可以把找到了旅行社的網站加到手機主畫面。不用另外下載安裝，下次點一下愛心圖示就直接打開。iPhone、Android 各 30 秒就能完成。",
    image: "/news/add-to-home-screen.jpg",
    imageAlt: "示意圖：從瀏覽器的分享選單點「加入主畫面」，手機主畫面就多了一個找到了旅行社的粉紅愛心圖示。",
    blocks: [
      {
        kind: "facts",
        id: "key-facts",
        title: "先看重點",
        items: [
          {
            label: "需要時間",
            value: "30 秒",
            note: "跟著下面的步驟點 3、4 下就完成。",
          },
          {
            label: "要不要下載",
            value: "不用",
            note: "不用到 App Store 或 Google Play，也不用註冊帳號，主畫面多一個圖示而已。",
          },
          {
            label: "內容",
            value: "隨時最新",
            note: "有網路時，每次打開都是網站目前的行程與團期，不用等更新。",
          },
        ],
      },
      {
        kind: "methods",
        id: "how-to",
        title: "怎麼加到主畫面",
        lede: "依你的手機選一種做法。請用 Safari 或 Chrome 打開本站；從 LINE、Facebook 裡直接點開的頁面沒有這個選項，做法看下面的常見問題。",
        items: [
          {
            name: "iPhone／iPad",
            badge: "Safari",
            audience: "iPhone、iPad 使用者",
            steps: [
              "用 Safari 打開找到了旅行社網站，任何一頁都可以",
              "點「分享」按鈕（方框加向上箭頭）；沒看到的話，先點網址列旁的「⋯」再點「分享」",
              "往下滑，選「加入主畫面」",
              "名稱會帶出「找到了」，按右上角「新增」就完成",
            ],
            note: "iPhone 上用 Chrome 也可以：點網址列右邊的分享按鈕，一樣選「加入主畫面」。",
          },
          {
            name: "Android",
            badge: "Chrome",
            audience: "Android 手機使用者",
            steps: [
              "用 Chrome 打開找到了旅行社網站",
              "畫面左下角出現「加到手機主畫面」提示時，直接點「安裝」",
              "沒看到提示的話，點右上角「⋮」，選「加到主畫面」或「安裝應用程式」",
              "再按一次「安裝」，愛心圖示就會出現在主畫面",
            ],
          },
        ],
      },
      {
        kind: "tips",
        id: "faq",
        title: "常見問題",
        items: [
          {
            title: "從 LINE 點開的頁面加不了？",
            text: "LINE、Facebook、Instagram 裡開的是 APP 自己的瀏覽器，沒有加到主畫面的選項。點右上角的選單，改用 Safari 或 Chrome 開啟，再照上面的步驟做。",
          },
          {
            title: "團期和價格會不會是舊的？",
            text: "有網路時，每次打開都向網站拿最新內容。沒網路時可以打開之前看過的頁面，畫面上方會提醒那是上次存下的內容；報名前，團期與價格請以顧問確認為準。",
          },
          {
            title: "會不會一直跳通知？",
            text: "不會。加到主畫面不會開啟通知，新消息與團期一樣在 LINE 社群分享。",
          },
          {
            title: "不想要了怎麼刪？",
            text: "跟刪除一般 APP 一樣：長按圖示，選「移除」或「刪除」。刪掉的只是主畫面上的圖示，之後仍然可以用瀏覽器打開網站。",
          },
        ],
      },
    ],
    sources: [],
    closing: {
      title: "下次想看行程，點主畫面的愛心就好。",
      text: "看到喜歡的行程，直接按 LINE 問顧問，團期與價格我們幫你確認。",
    },
  },
  {
    slug: "esun-card-europe-2026",
    title: "刷玉山卡暢遊歐洲，熱門團每人現折 NT$1,000",
    shortTitle: "玉山卡歐洲優惠",
    category: "限時優惠",
    publishedAt: "2026-11-20",
    summary:
      "12/31 前報名瑞士火車團、芬蘭極光團或巴爾幹半島團，用玉山信用卡付團費，每人現折 NT$1,000。歐洲想了很久的人，今年就把它排進行程吧。",
    image: "/news/esun-card-europe-2026.jpg",
    imageAlt:
      "刷玉山卡暢遊歐洲活動主視覺：最熱門團型現折 NT$1,000，活動期間 2026/08/15～2026/12/31。畫面有布達佩斯國會大廈夜景、瑞士馬特洪峰與芬蘭極光玻璃屋，下方標示「謹慎理財 信用無價」與玉山銀行標誌。",
    imageBanner: true,
    blocks: [
      {
        kind: "facts",
        id: "key-facts",
        title: "先看重點",
        items: [
          {
            label: "每人現折",
            value: "NT$1,000",
            note: "報名指定的歐洲團，用玉山信用卡支付團費。",
          },
          {
            label: "報名截止",
            value: "2026/12/31",
            note: "活動自 2026/8/15 開始，在 12/31 前完成報名並刷卡付款。",
          },
          {
            label: "適用卡片",
            value: "玉山信用卡",
            note: "所有玉山銀行信用卡都適用；持卡人須是實際出團的旅客。",
          },
        ],
      },
      {
        kind: "routes",
        id: "routes",
        title: "三種歐洲熱門團",
        lede: "優惠適用以下三種團型。每一種都附上本站的行程，點進去看每日行程與出發日；實際適用的團期，報名時跟顧問確認就好。",
        items: [
          {
            name: "瑞士火車團",
            area: "西歐",
            offer: "每人現折 NT$1,000",
            text: "把瑞士最有名的景觀列車串成一條路線：冰河列車、黃金列車輪流上場，再換登山火車與纜車上到少女峰、遠望阿萊奇冰河，最後在策馬特等馬特洪峰被日出染成金色。",
            highlights: ["馬特洪峰", "少女峰", "阿萊奇冰河", "景觀列車"],
            trips: ["switzerland-train-15d", "switzerland-train-10d"],
          },
          {
            name: "芬蘭極光團",
            area: "北歐",
            offer: "每人現折 NT$1,000",
            text: "冬天到拉普蘭追極光：住進玻璃屋，躺在床上就能等極光出現。白天去聖誕老人村、坐哈士奇與馴鹿雪橇，再搭破冰船出海，看整片結冰的海面。",
            highlights: ["極光玻璃屋", "破冰船", "聖誕老人村", "哈士奇雪橇"],
            trips: ["finland-icebreaker-glass-igloo-10d", "finland-aurora-10d"],
          },
          {
            name: "巴爾幹半島團",
            area: "東歐",
            offer: "每人現折 NT$1,000",
            text: "走進還不算熱門的東南歐：羅馬尼亞的布拉索夫與中世紀古城、保加利亞的山城與修道院。想走得更深，17 天行程一路串起巴爾幹 8 國，延伸到亞得里亞海岸。",
            highlights: ["羅馬尼亞", "保加利亞", "中世紀古城", "亞得里亞海"],
            trips: ["balkans-leisure-9d", "balkans-value-17d"],
          },
        ],
      },
      {
        kind: "text",
        id: "unicard",
        title: "Unicard 卡友再加碼",
        paragraphs: [
          "用玉山 Unicard 付團費，除了每人現折 NT$1,000，依玉山銀行的 Unicard 權益，最高還能拿到 4.5% 玉山 e point 回饋，1 點可折抵 NT$1。",
          "e point 由玉山銀行發放，回饋比例、適用通路與上限以玉山銀行公告為準。",
        ],
      },
      {
        kind: "methods",
        id: "how-to-book",
        title: "怎麼報名",
        lede: "跟平常報名一樣，只要記得一件事：報名時先說要用玉山卡優惠。",
        items: [
          {
            name: "找顧問報名",
            audience: "已經選好團型，或還在比較出發日的人",
            steps: [
              "挑好團型與想出發的月份，還沒決定也可以先問",
              "用 LINE 或聯絡表單找顧問，說明要使用「玉山卡歐洲優惠」",
              "顧問確認名額與團費後，用玉山信用卡付團費，每人現折 NT$1,000",
            ],
            note: "線上分期付款不適用本優惠。",
          },
        ],
      },
      {
        kind: "tips",
        id: "notes",
        title: "注意事項",
        items: [
          {
            title: "限用玉山信用卡付款",
            text: "須在活動期間內用玉山信用卡支付團費；線上分期付款不適用。",
          },
          {
            title: "不與其他優惠併用",
            text: "不能和團體優惠、VIP 優惠或其他促銷方案同時使用。",
          },
          {
            title: "持卡人須是出團旅客",
            text: "刷卡的持卡人必須實際參團。每位旅客、每張卡、每一團限折一次。",
          },
          {
            title: "報名時先告訴顧問",
            text: "請在報名時主動說要使用玉山卡優惠，團費會直接折抵。",
          },
          {
            title: "以公告為準",
            text: "優惠內容如有調整，以找到了旅行社的公告為準。",
          },
          {
            title: "謹慎理財，信用無價",
            text: "刷卡付團費前，請先評估自己的還款能力。",
          },
        ],
      },
    ],
    sources: [
      {
        label: "找到了旅行社官網：刷玉山卡暢遊歐洲活動公告",
        href: "https://discoveredtravel.com.tw/news/detail/2026traveldiscount-esunbank-europe",
      },
    ],
    disclaimer:
      "本文整理至 2026/11/20。優惠內容以找到了旅行社公告為準，Unicard 回饋以玉山銀行公告為準。謹慎理財，信用無價。",
    closing: {
      title: "歐洲想了很久，今年就出發吧。",
      text: "12/31 前報名都能折。想知道哪一團還有位子、哪個月份最適合，直接問顧問最快。",
    },
  },
  {
    slug: "tokyo-nikki-stay-and-charter",
    title: "東京日記：西日暮里民宿＋台灣人司機接送包車，一次排好",
    shortTitle: "東京日記民宿包車",
    category: "東京住宿・包車",
    publishedAt: "2026-11-18",
    summary:
      "自己去東京，住哪裡、機場怎麼進市區、想去河口湖又怎麼排？東京日記把西日暮里的三間民宿，和台灣人司機的機場接送、包車放在同一個網站：看空房、排接送、算費用，一次搞定。",
    image: "/news/tokyo-nikki.jpg",
    imageAlt: "東京運河兩旁盛開的櫻花，河岸掛著粉紅燈籠。照片為東京街景示意，非民宿實景。",
    blocks: [
      {
        kind: "text",
        id: "about",
        title: "東京日記是什麼",
        paragraphs: [
          "東京日記是我們在東京的民宿與包車服務：西日暮里有三間民宿，再加上台灣人司機的機場接送與包車。中文溝通、價格先講清楚，適合自由行、家族出遊和帶長輩的旅程。",
          "西日暮里站有 JR 山手線、京濱東北線、東京Metro 千代田線與日暮里・舍人線。搭山手線 3 站到上野、5 站到秋葉原和池袋，千代田線直達表參道；隔壁日暮里站轉 Skyliner，直達成田機場。",
          "房價已經包含退房清潔費；接送、包車的報價也含司機、高速公路過路費、油錢與保險，不會到了現場才多出一筆。",
        ],
      },
      {
        kind: "facts",
        id: "key-facts",
        title: "先看重點",
        items: [
          {
            label: "民宿",
            value: "¥20,000 起",
            note: "每晚。兩房一廳到整棟包下，最多 6 人；退房清潔費已含。",
          },
          {
            label: "機場接送",
            value: "¥20,000 起",
            note: "單程，羽田 ↔ 東京市區／迪士尼，1～5 人。",
          },
          {
            label: "包車一日遊",
            value: "¥30,000 起",
            note: "10 小時，東京市區 ↔ 迪士尼來回，1～5 人。",
          },
        ],
      },
      {
        kind: "tips",
        id: "stays",
        title: "三種住法",
        items: [
          {
            title: "B棟 2F｜¥22,000／晚",
            text: "兩房一廳、4 張單人床，乾濕分離衛浴與陽台。好友或一家四口剛剛好，加一床可住 5 人（¥27,000／晚）。",
          },
          {
            title: "B棟 3F｜¥20,000／晚",
            text: "同樣兩房一廳、4 張單人床與陽台，位在頂樓，價格更輕鬆。加一床可住 5 人（¥25,000／晚）。",
          },
          {
            title: "包棟｜¥30,000／晚",
            text: "三層樓整棟包下，3 房 1 廳：4 張單人床加 1 張 Queen，可住 6 人。兩套衛浴（淋浴間與浴缸），另有烘衣機，6 個人不用排隊洗澡。",
          },
          {
            title: "每一間都有",
            text: "廚房與簡易廚具、洗衣機、Wi-Fi、吹風機，以及沐浴乳、洗髮精、潤髮乳。住幾晚都像在東京生活。",
          },
        ],
      },
      {
        kind: "compare",
        id: "airport-transfer",
        title: "機場接送價目（單程）",
        columns: ["1～5 人（Alphard）", "6～9 人（HiAce）"],
        rows: [
          { label: "成田 ↔ 東京市區／迪士尼", before: "¥25,000", after: "¥30,000" },
          { label: "成田 ↔ 橫濱市區／吉祥寺", before: "¥30,000", after: "¥35,000" },
          { label: "成田 ↔ 河口湖／箱根", before: "¥55,000", after: "¥65,000" },
          { label: "羽田 ↔ 東京市區／迪士尼", before: "¥20,000", after: "¥25,000" },
          { label: "羽田 ↔ 橫濱市區／吉祥寺", before: "¥25,000", after: "¥30,000" },
          { label: "羽田 ↔ 河口湖／箱根", before: "¥45,000", after: "¥55,000" },
        ],
      },
      {
        kind: "compare",
        id: "day-charter",
        title: "包車一日遊價目（10 小時）",
        columns: ["1～5 人（Alphard）", "6～9 人（HiAce）"],
        rows: [
          { label: "東京市區 ↔ 迪士尼來回接送", before: "¥30,000", after: "¥36,000" },
          { label: "東京市區一日遊", before: "¥40,000", after: "¥50,000" },
          { label: "橫濱／鎌倉／川越", before: "¥45,000", after: "¥55,000" },
          { label: "河口湖／箱根／足利", before: "¥50,000", after: "¥60,000" },
          { label: "熱海／茨城／千葉", before: "¥55,000", after: "¥65,000" },
          { label: "輕井澤／日光／伊豆", before: "¥60,000", after: "¥70,000" },
        ],
      },
      {
        kind: "text",
        id: "included",
        title: "車資包含什麼",
        paragraphs: [
          "接送與包車的價格都含台灣人司機、高速公路過路費、油錢與保險。包車 10 小時從司機由東京出發起算，到回到東京為止。",
          "不包含：私有道路等特定景點的過路費、景點門票，以及停車費（實報實銷，非必要不進停車場）。",
          "可能的加價：超時每小時 ¥3,000（超過 30 分鐘以 1 小時計）；深夜 23:00～06:59 加 ¥3,000；離開東京 2 天 1 夜以上，司機住宿每晚 ¥6,000；兒童座椅免費 1 張，第 2 張起每張 ¥3,000（5 歲以上不需要）。",
          "接機當天就想順路去玩，或送機前想先繞去走走，也可以把接送加成當日包車，每小時 ¥3,000。",
        ],
      },
      {
        kind: "methods",
        id: "how-to-book",
        title: "怎麼預約",
        lede: "空房日曆和試算單都在東京日記的網站上，不用登入、不必先留資料。",
        items: [
          {
            name: "線上試算，傳訊息預約",
            audience: "想自己排日期、接送和包車的人",
            steps: [
              "選房型與入住、退房日期，日曆會顯示目前的空房",
              "加上接機、送機或包車日，試算單即時算好現場要付的日幣",
              "按「產生預約訊息」，複製後貼到東京日記的 LINE 或 Facebook 傳送",
              "確認空房後會提供匯款資訊：每筆預約（民宿、每趟接送、每天包車）先匯台幣訂金 NT$1,000，其餘以日幣現場支付",
            ],
            note: "網站試算僅供參考，實際金額與空房以東京日記的回覆為準。其他地點的包車或接送，也可以直接詢問報價。",
            link: {
              label: "前往東京日記空房日曆",
              href: "https://tokyonikki.tabiyoi.com/booking.html",
            },
          },
        ],
      },
      {
        kind: "tips",
        id: "notes",
        title: "入住與預約須知",
        items: [
          {
            title: "接送、包車要提早訂",
            text: "無法接當天、隔天的接送與包車。確定航班後，建議就先預約。",
          },
          {
            title: "牙刷、浴巾請自備",
            text: "為了衛生環保，沒有提供一次性牙刷與浴巾，車站旁的百円店就買得到。沐浴乳、洗髮精、潤髮乳與吹風機都有準備。",
          },
          {
            title: "室內全面禁煙",
            text: "所有房源室內都不能抽菸，B棟 2F、3F 設有陽台。",
          },
          {
            title: "包棟靠近電車軌道",
            text: "早上 5 點到晚上 11 點，大約每 30 分鐘有電車經過，3 樓房間會有輕微噪音與振動。淺眠的旅客建議睡 1、2 樓。",
          },
          {
            title: "住宿期間不含打掃",
            text: "退房清潔已含在房價裡。住到一半需要打掃，每次 ¥10,000，可以在預約時一起說。",
          },
          {
            title: "訊息回覆比較慢",
            text: "司機每天都在開車接送，回覆需要一點時間，請耐心等候。",
          },
        ],
      },
    ],
    sources: [
      { label: "東京日記：首頁", href: "https://tokyonikki.tabiyoi.com/" },
      { label: "東京日記：住宿", href: "https://tokyonikki.tabiyoi.com/stays.html" },
      { label: "東京日記：接送・包車價目", href: "https://tokyonikki.tabiyoi.com/ride.html" },
      { label: "東京日記：入住與預約須知", href: "https://tokyonikki.tabiyoi.com/guide.html" },
    ],
    disclaimer:
      "本文整理至 2026/11/18，價格以日幣計。實際金額、車型與空房以東京日記的回覆為準。",
    closing: {
      title: "住宿、接送交給東京日記，行程交給我們。",
      text: "想排東京自由行，或要我們幫忙規劃整趟日本旅程，都可以直接問顧問。",
    },
  },
  {
    slug: "japan-tax-free-2026",
    title: "日本免稅新制 11/1 上路：退稅 3 種方式一次看懂",
    shortTitle: "日本免稅新制",
    category: "日本旅遊須知",
    publishedAt: "2026-10-31",
    author: "Yui",
    summary:
      "2026 年 11 月 1 日起，日本購物改為先付含稅價，離境完成海關確認後才退稅。看了這麼多攻略還是霧颯颯？Yui 幫大家整理好了，其實退稅主要就是這 3 種方式。",
    image: "/news/japan-tax-free-2026.jpg",
    imageAlt:
      "日本退稅新制圖卡：2026.11.01 起先付含稅價、出境海關確認、店家退款；同店同日未稅滿 5,000 日圓，購買後 90 天內出境確認。圖中旅人躺在滿地的購物袋之間。",
    imagePoster: true,
    blocks: [
      {
        kind: "facts",
        id: "key-facts",
        title: "先看重點",
        items: [
          {
            label: "上路日期",
            value: "2026/11/1",
            note: "以購買日為準：10/31 以前買的適用舊制，11/1 起買的適用新制。",
          },
          {
            label: "購物門檻",
            value: "¥5,000",
            note: "同一家店、同一天，未稅金額合計達 5,000 日圓以上。",
          },
          {
            label: "海關確認期限",
            value: "90 天",
            note: "購買日起 90 天內，帶著商品離境並完成海關確認。",
          },
        ],
      },
      {
        kind: "compare",
        id: "what-changed",
        title: "新舊制差在哪",
        columns: ["2026/10/31 以前購買", "2026/11/1 起購買"],
        rows: [
          {
            label: "結帳金額",
            before: "未稅價，當場免稅",
            after: "含稅價，先付再退",
          },
          {
            label: "拿回稅金",
            before: "不需另外申請",
            after: "海關確認後，由店家或退稅業者退款",
          },
          {
            label: "消耗品",
            before: "需特殊包裝，上限 50 萬日圓",
            after: "取消特殊包裝與上限，但在日本用掉就不能退",
          },
        ],
      },
      {
        kind: "methods",
        id: "three-ways",
        title: "退稅主要有 3 種方式",
        lede: "前兩種是完成海關確認的做法，選一種就好；第三種是提早拿到現金，出境時一樣要做海關確認。",
        items: [
          {
            name: "Visit Japan Web",
            badge: "最推薦",
            audience: "習慣用手機、想少排隊的人",
            steps: [
              "出發前先註冊 VJW，填好護照資料；抵達日本後補上入境許可資訊",
              "購物時出示免稅 QR Code（不是每家店都支援，護照記得帶著）",
              "到機場，託運行李前先連上海關專用 Wi-Fi",
              "登入 VJW 點「退稅手續」，核對紀錄後按 Confirm",
              "顯示 Completed 就完成海關確認；顯示 Not Completed 請帶商品到海關檢查處",
              "等待退款至指定帳戶或信用卡",
            ],
            note: "可線上辦理的機場：成田、羽田、關西、中部、新千歲、福岡、那霸。系統介面只有英文，操作不順時改用機場機台就好。",
            link: {
              label: "前往 Visit Japan Web",
              href: "https://services.digital.go.jp/visit-japan-web/",
            },
          },
          {
            name: "機場自助機台",
            audience: "長輩不會用手機也沒關係",
            steps: [
              "託運行李前，到國際線出境大廳的免稅手續機台掃描護照",
              "依照畫面指示操作：綠燈代表完成；紅燈請帶商品到海關檢查處，由海關人工確認",
              "依購物時店家說明的方式收款，例如信用卡、帳戶或 App",
            ],
            note: "用機台不需要註冊 VJW。部分機場也能領現金，但多半要付手續費，能不能領要看店家配合的退稅業者。",
            link: {
              label: "查詢各機場機台位置",
              href: "https://www.customs.go.jp/kaigairyoko/taxrefund/map.htm",
            },
          },
          {
            name: "市區先行退稅",
            audience: "想在離境前先拿到現金的人",
            steps: [
              "到指定店家辦理，例如友都八喜部分門市",
              "在櫃台選擇現金，離境前先拿到退款",
              "出境時仍須完成海關確認，用 VJW 或機場機台都可以",
            ],
            note: "友都八喜目前有 11 家門市提供：新宿、池袋、秋葉原、上野、橫濱、名古屋、京都、梅田、博多、札幌、仙台。據報導辦理時需登記本人信用卡作為擔保，沒有完成海關確認，款項與手續費可能從卡片扣回。",
          },
        ],
      },
      {
        kind: "names",
        id: "zero-fee",
        title: "退稅申請 0 手續費店家",
        lede: "新制的手續費由各店家與退稅業者自訂，日本政府沒有統一標準。目前公布由店家吸收退稅申請手續費的有：",
        items: ["唐吉訶德 DONKI", "Bic Camera", "多慶屋 TAKEYA", "鶴羽藥妝 Tsuruha"],
        note: "0 手續費不代表到手金額沒有落差：在機場領現金仍可能被收手續費，刷卡退款也可能有匯差。優惠可能調整或提前結束，實際適用門市、退款管道及額外費用依店家公告為準。",
      },
      {
        kind: "tips",
        id: "reminders",
        title: "貼心提醒",
        items: [
          {
            title: "託運前先完成海關確認",
            text: "商品要帶在身邊。行李託運後拿不回來，遇到紅燈就無法出示商品，等於退不了稅。",
          },
          {
            title: "收據、紀錄和商品都留著",
            text: "海關以收據為單位確認，同一張收據少一件，整張都不能退。收據與退稅紀錄請留到退款完成。",
          },
          {
            title: "食品、藥妝別先用掉",
            text: "在日本吃掉、用掉的消耗品不能退稅。已經用掉的話不要操作機台，直接告訴海關人員。",
          },
          {
            title: "轉機看最後一站",
            text: "先搭日本國內線再轉國際線，要在最後離開日本的機場辦理。",
          },
          {
            title: "新制剛上路，提早抵達機場",
            text: "尖峰時段可能要排隊，遇到紅燈還要受檢。海關和航空公司不會為錯過班機負責，時間請抓寬一點。",
          },
          {
            title: "退款問題找店家",
            text: "完成海關確認不等於錢已入帳。退款進度請問購買的店家或退稅業者，海關窗口無法回答。",
          },
        ],
      },
    ],
    video: {
      title: "完整流程，點進影片看",
      text: "Yui 把流程拍成影片了，出發前收藏起來，到機場直接照著做。",
      link: {
        label: "到 Instagram 看影片",
        href: "https://www.instagram.com/reel/DfKJA2NuySC/",
      },
    },
    sources: [
      {
        label: "日本觀光廳：旅客專頁與多語言文宣",
        href: "https://www.mlit.go.jp/kankocho/tax-free/page01_000001_00021.html",
      },
      {
        label: "日本觀光廳：旅客常見問題",
        href: "https://www.mlit.go.jp/kankocho/tax-free/page01_000001_00023.html",
      },
      {
        label: "日本國稅廳：線上辦理海關確認操作指南（繁中）",
        href: "https://www.nta.go.jp/publication/pamph/shohi/menzei/201805/format/002/onlinetetsuzuki/guidetwn.htm",
      },
      {
        label: "日本國稅廳：線上辦理海關確認常見問題（繁中）",
        href: "https://www.nta.go.jp/publication/pamph/shohi/menzei/201805/format/002/onlinetetsuzuki/faqtwn.htm",
      },
      {
        label: "日本海關：離境退稅程序說明",
        href: "https://www.customs.go.jp/kaigairyoko/taxrefund.htm",
      },
      {
        label: "聯合新聞網：退稅新制整理包（2026/10/30）",
        href: "https://udn.com/news/story/6811/9846553",
      },
      {
        label: "NOWnews：Bic Camera、唐吉訶德免手續費（2026/10/8）",
        href: "https://www.nownews.com/news/6881840",
      },
      {
        label: "中時新聞網：唐吉訶德手續費 0 元（2026/10/6）",
        href: "https://www.chinatimes.com/realtimenews/20261006001646-260405",
      },
      {
        label: "Global Blue：友都八喜 11 家門市市區退稅",
        href: "https://news.infoseek.co.jp/article/prtimes_000000027_000022577/",
      },
      {
        label: "Yahoo! 專家評論：市區現金退稅的信用卡擔保機制",
        href: "https://news.yahoo.co.jp/expert/articles/d44adc5fa298e46cda308f71f06fe90d4860453f",
      },
    ],
    disclaimer:
      "本文整理至 2026/10/31。新制剛上路，實際適用門市、退款管道及額外費用依店家公告為準。",
    closing: {
      title: "準備去日本的朋友，這篇先收藏起來。",
      text: "繼續把錢花光、為國爭光。行程還沒排好，也可以交給我們一起想。",
    },
  },
];

/** 台灣今天的日期（YYYY-MM-DD）。 */
export function taipeiDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(now);
}

/**
 * 排程發布：publishedAt 還沒到的文章先不出現（列表、內頁、網站地圖都看不到），
 * 到了那天（台灣時間）自動上線。可以一次寫好幾篇、日期排開，每週固定出一篇。
 */
export function publishedNews(articles: NewsArticle[] = newsArticles, today = taipeiDate()) {
  return articles
    .filter((article) => article.publishedAt <= today)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function findNewsArticle(slug: string, articles: NewsArticle[] = newsArticles, today = taipeiDate()) {
  return publishedNews(articles, today).find((article) => article.slug === slug);
}

export function newsDateLabel(date: string) {
  return date.replaceAll("-", ".");
}
