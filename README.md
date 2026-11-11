# 找到了旅行社網站

找到了旅行社業務團隊的公開形象官網與行程管理後台。

- 前台公開瀏覽，不需要 ChatGPT 或其他會員帳號
- `/studio` 使用核准 Email 與密碼登入
- 行程支援不限筆數；同一行程可建立多個航空／內容方案，各自上傳 PDF 或設定 Google Drive 分享連結
- 首頁使用公司 Logo、正式影片、天氣、當地時間與匯率工具
- `/contact` 公開聯絡表單，先存檔，再發送通知；失敗可重試，並在 `/studio/contacts` 查看狀態
- Railway 連接 GitHub `main` 後，每次推送會自動重新部署

## 本機設計預覽

沒有 Bucket 憑證時，可將正式站已公開的內容快照（`SiteContent` 結構，至少包含
`trips`）保存在 `work/design-preview.json`，於 `.env.local` 設定
`FOUND_DESIGN_PREVIEW=1`，再執行 `npm.cmd run dev`。公開頁面會標示本機預覽，
內容管理儲存會被阻擋。快照與 `.env.local` 都不會進入 Git。

此功能只在 `NODE_ENV=development` 生效；正式建置與正式服務一律沿用 Bucket。
未啟用時保留原本的內容讀取與錯誤處理。聯絡表單仍須配置儲存服務才能成功收件，
版面驗證請勿送出實際客戶資料。

## 航空版本與批次團期

在後臺「行程管理」展開行程後，每個航空／行程版本可以分別編輯名稱、
航班時段、住宿安排與對應 PDF／Drive 文件。版本收合時會顯示文件狀態與團期數。
「複製版本」會沿用文字與價格，文件和團期需重新設定，避免誤用另一航空的資料。

不規則團期可在版本內的「批次新增團期」使用：

- **月曆多選**：點選日期，可跨月選取，再填共同價格與備註。
- **貼上 Excel**：複製「日期、價格、備註」三欄，可含標題列，每批最多 366 列。
  日期需含年份（例如 `2026/10/03` 或 `20261003`）；價格填正整數，支援千分位。
- **預覽與修正**：可逐列改日期、價格、備註或移除。無效日期、同版本既有日期與批次重複日期會標示，修正後才能加入草稿。
- **加入與儲存**：新增的日期只套用到目前版本，最後按「儲存並更新網站」才會上線。

版本批次新增會將「適用所有團期」轉成明確的既有日期清單，保留現有對應，
避免其他航空自動取得這批日期。若要共用日期，使用「套用既有團期」逐筆或按月勾選。
不同版本可使用同一天但不同價格；同一筆共用團期的價格修改則會影響所有套用版本。
已加入的資料可在下方「出發日期表」修改，列上會顯示適用版本。

前臺以航空與版本名稱辨識文件，未填寫的航班／住宿比較欄位不會顯示。
旅客選日期後會看到該團期價格，詢問表單也會帶入版本與日期；未選日期時維持版本／行程的參考起價。

## Railway 第一次設定

1. 在 Railway 選擇 **Deploy from GitHub repo**。
2. 選擇 `Andykyo25/found-travel-website`。
3. 在同一個 Railway Project 按 **Create → Bucket**，名稱可填
   `found-travel-files`。
4. 進入網站 Service 的 **Variables**，對 Bucket 使用
   **Add Reference / Auto-inject**，讓網站取得 Bucket credentials。
5. 在網站 Service 的 Variables 加入：

```text
STUDIO_ADMIN_EMAIL=tgfc069@gmail.com
STUDIO_ADMIN_PASSWORD=請在 Railway 介面填入至少 8 字元的密碼
```

`STUDIO_ADMIN_PASSWORD` 只應儲存在 Railway Variables，不要寫入 GitHub。
需要自行指定 session 簽章時，可再加入至少 32 字元的
`STUDIO_SESSION_SECRET`；未設定時網站會從後台帳號名單安全衍生。

6. 部署完成後，進入 **Settings → Networking → Generate Domain**，
   取得免費的 `*.up.railway.app` 網址。

Railway Bucket 會保存首頁內容、行程 PDF 與客人聯絡表單，因此 GitHub 重新部署
不會清除業務已上架的資料。

## 新增業務的管理員帳號

要讓每位業務有自己的登入帳號，在網站 Service 的 Variables 加入
`STUDIO_USERS`，一行一組「Email:密碼」（也可用分號分隔多組）：

```text
STUDIO_USERS=amy@example.com:密碼至少8字元
bob@example.com:另一組密碼8字元
```

- Email 與密碼之間的冒號，半形「:」或全形「：」皆可。
- 密碼至少 8 字元；不可包含換行、逗號或分號（半形與全形皆同）。
- 原本的 `STUDIO_ADMIN_EMAIL` / `STUDIO_ADMIN_PASSWORD` 仍然有效，
  會與 `STUDIO_USERS` 名單合併。
- 移除某一行後（Railway 改變數會自動重新部署），該帳號立即失效，
  已登入的 session 也會馬上作廢。
- 後台儲存內容時會記錄操作者 Email，可追溯是哪位業務更新的。
- 未設定 `STUDIO_SESSION_SECRET` 時，調整名單會讓所有人需要重新
  登入一次；建議加上固定的 `STUDIO_SESSION_SECRET` 避免此情況。

## 聯絡表單與 LINE 通知

客人在前台 `/contact` 送出「聯絡人／行動電話／希望聯繫時段／內容」後：

1. 表單存進 Railway Bucket 的 `contact-requests/`，每筆一個檔案。
2. 網站於回應後發送 LINE／Webhook 通知，記錄各管道的結果。
3. 業務登入 `/studio` 切到 **聯絡諮詢** 分頁即可看到全部表單，並可匯出 CSV。

通知需要在網站 Service 的 Variables 設定，以下兩種擇一（兩種都設會同時送）：

**方式一：LINE Messaging API（不經第三方）**

```text
LINE_CHANNEL_ACCESS_TOKEN=LINE Developers 後台的 Channel access token
LINE_TARGET_ID=要收通知的群組 ID 或個人 userId
```

需先在 LINE Developers 建立 Messaging API channel，把官方帳號邀請進業務群組，
再由 webhook 事件取得該群組的 `groupId`。

**方式二：Make / Zapier Webhook（沿用現有自動化流程）**

```text
CONTACT_WEBHOOK_URL=自動化服務提供的 Webhook 網址
```

網站會以 POST 送出 JSON，其中 `text` 欄位已經是排版好的通知訊息，
另外也附上 `id`、`name`、`mobile`、`preferredTimes`、`message`、`createdAt` 供自行組版。

網站程序每分鐘檢查待送記錄，一次最多處理 10 筆；單輪最多嘗試 5 次，
失敗後以 1、2、4、8 分鐘間隔重試。服務停機時暫停，重新啟動後繼續。
後台可手動補送；已成功的管道不會再次發送。舊表單不會自動補送。
LINE 使用固定 retry key，Webhook 帶有 `Idempotency-Key`，接收端需依此鍵去重；
網路中斷可能導致「對方已收件、本站尚未確認」，因此無法保證只送達一次。
通知處理使用 Bucket ETag 條件寫入及兩分鐘租約，避免多個程序同時處理。
若最後一次嘗試期間服務中斷，可於租約到期後從後台補送。
目前每輪會掃描詢問單；資料量成長後宜改用資料庫索引與獨立佇列。

兩者都未設定時，表單仍會正常收件並存檔，只是群組不會收到即時通知，
後台聯絡諮詢分頁會顯示提醒。

為避免表單機器人灌爆，同一來源 IP 每 10 分鐘最多送出 5 次。

## Railway Bucket 變數

網站同時支援 Railway Bucket 原始 credential 名稱及 Auto-inject 常見名稱：

- `BUCKET` 或 `BUCKET_NAME`
- `ENDPOINT` 或 `BUCKET_ENDPOINT`
- `ACCESS_KEY_ID` 或 `BUCKET_ACCESS_KEY_ID`
- `SECRET_ACCESS_KEY` 或 `BUCKET_SECRET_ACCESS_KEY`
- `REGION` 或 `BUCKET_REGION`

## 詢問單、內容歷史與 PDF 保留

### 多方案行程

- 後台可在同一行程新增多個方案，分別填寫航空公司、方案名稱、差異摘要與方案起價。
- 每個方案都有獨立的 PDF／Google Drive 文件，並可選擇套用所有團期或指定部分團期。
- 前台有兩個以上已發布方案時會顯示比較卡；團期表也會標示該日期可選的方案。
- 舊版單一 `documentUrl` 行程在讀取時會自動轉為一個「標準行程方案」，不需先手動搬移資料。

- 後台 `/studio/contacts` 每筆詢問單都有刪除按鈕。刪除前會再次確認，
  成功後會永久移除 Bucket 內對應的 JSON，無法復原。
- 每次儲存會先將前一版內容存到 `content-history/`，再以 ETag 條件寫入發布內容。
  同時編輯發生衝突會回覆 409，請重新載入最新內容後再編輯。
- PDF 不再於儲存時自動刪除，避免破壞歷史內容或其他人的草稿。
  清理前需核對發布內容、歷史版本和仍在編輯的草稿；歷史與 PDF 目前無自動保留期限。
- 歷史檔是原始 JSON，尚未提供一鍵復原介面。Bucket 讀取失敗時，後台禁止儲存；
  前台優先顯示該程序最後成功讀取的內容，沒有快取時顯示可重試的錯誤頁。
- 部署環境必須支援 S3 `If-Match`／`If-None-Match` 條件寫入；本機以模擬服務驗證並發，
  正式 Railway 相容性仍需在獨立測試物件驗證，請勿用正式內容做競爭寫入測試。

## 團期與前台流程

- 日期接受完整年月日（例如 `2026/09/08`、`20260908`），會驗證實際日曆日期。
  錯誤日期必須修正或移除後才能發布；系統不猜測原本要填的日期。
- 同一天有不同價格時，請填寫團期備註或指定可區別的方案。
- 前台依台北日期排除過期與無效團期，支援目的地、月份及預算篩選，總表每頁 24 筆。
- 行程卡先進入介紹與團期頁；諮詢連結帶入行程、日期、備註、參考價格或所選方案。

## 業務系統團期同步

官網可以定時從業務系統（動態資訊查詢系統）抓團期，套到對應的行程上，不用手動填日期。

- **抓什麼**：只取出發日、售價、狀態（即將額滿／額滿／已成團）。旅客姓名、利潤、票款、領隊都不讀也不存；剩餘人數不對外顯示（剩 6 位以下標「即將額滿」）。
- **多久一次**：每 3 小時，啟動後一分鐘先跑第一次。後台「團期同步」頁可以按「立即同步」。
- **怎麼對應**：依「地區 + 行程名稱 + 天數 + 航空」自動配對。有把握的自動套用；拿不準的列在後台「團期同步 › 待確認」，選一次之後就記住。也可以對某個行程選「不要套用同步團期」。
- **不會改到什麼**：同步結果另外存放，套用只發生在前台讀取時，業務在「行程管理」填的團期原封不動。行程沒有對應、或同步超過三天沒成功時，前台就顯示業務手填的團期。
- **目前不處理**：國旅與郵輪（MSC、麗星）的動態檔排版不同，維持手動。

啟用方式：在 Railway Variables 填 `TOUR_FEED_EMAIL`、`TOUR_FEED_PASSWORD`、`TOUR_FEED_API_KEY`、`TOUR_FEED_API_URL` 四個變數（說明見 `.env.example`）。帳號請用專門給網站的那一組。四個沒填齊就不會同步，網站照常運作。

## 最新消息

消息內容寫在 `lib/news.ts` 的 `newsArticles`，不經過後台。新增一則時加一筆資料即可，
`/news` 列表、`/news/<slug>` 內頁與網站地圖會自動帶出；內文由 `blocks` 組成，
可用 `text`、`facts`、`compare`、`methods`、`names`、`tips` 六種區塊。
涉及規定或費用的內容請附上 `sources`，改版時填寫 `updatedAt`。
封面放在 `public/news/`；圖片本身含文字的 4:5 圖卡請設 `imagePoster: true`，會完整顯示不裁切。

## 網址與搜尋引擎

正式網域是 `https://tabiyoi.com`（Cloudflare 購買與代管 DNS，Proxy 開啟、SSL 模式 Full），
Railway Variables 的 `SITE_URL` 設成 `https://tabiyoi.com`（HTTPS origin，不含路徑）。
`www.tabiyoi.com` 與 Railway 臨時網域（`*.up.railway.app`）的公開頁面會 308 轉到正式網域，
API 與後台路徑維持原有路由；臨時網域維持禁止搜尋引擎索引。

轉址規則在 `next build` 時產生，所以 `Dockerfile` 的建置階段用 `ARG SITE_URL` 宣告
（Railway 只把有宣告的變數帶進建置）；改 `SITE_URL` 後要重新部署才會生效。
臨時網域用固定樣式比對，不依賴 `RAILWAY_PUBLIC_DOMAIN`：接上自訂網域後它可能變成自訂網域。

## AI 搜尋（GEO）

讓 ChatGPT、Perplexity、Google AI 摘要這類工具回答「某行程多少錢、何時出發、哪家旅行社」時，能從官網找到可以直接引用的句子。全部由行程資料自動產生，不用另外維護。

- **行程速覽**：每個行程頁在總覽下方有一段摘要與事實表（天數、團費、出發日範圍、可報名團數、航空、出團旅行社與執照）。
- **自動問答**：每個行程頁的「常見問題」會先列出由資料算出的問答（多少錢、什麼時候出發、搭哪家航空、怎麼報名），業務在後台自己寫的問答接在後面；同時輸出 FAQ 結構化資料。
- **關於我們**：輸出旅行社結構化資料（公司名稱、執照、地址，來自後台「網站設定」），頁面上不另外顯示。
- **`/llms.txt`**：給 AI 助理的網站導覽，列出公司資訊、主要頁面，以及每個目的地底下所有行程的天數、起價與最近可報名日期。
- AI 爬蟲（GPTBot、ClaudeBot、PerplexityBot 等）沒有被 `robots.txt` 擋；若在 Cloudflare 開了「Block AI bots」，這些工具就讀不到官網。

## 頁面快取

前台頁面有兩層快取，後台（`/studio`）、API 與聯絡表單都不在內。

**伺服器記憶體（已生效，不用設定）**：發布內容留在記憶體，超過 30 秒就在背景重讀 Bucket，
訪客不用等。業務在後台存檔後，同一台伺服器立刻換成新內容。

**Cloudflare 邊緣節點（要在 Cloudflare 後台開啟）**：伺服器在美國西岸，讓 Cloudflare 把公開頁面
留 60 秒，台灣訪客就不必每頁都回源。程式已經替公開頁面送出 `Cloudflare-CDN-Cache-Control`
（設定在 `lib/edge-cache.ts`），但 Cloudflare 預設不暫存 HTML，要加一條規則才會生效：

1. Cloudflare 後台 → `tabiyoi.com` → Caching → Cache Rules → Create rule。
2. 條件選 Edit expression，貼上：

   ```
   (http.host eq "tabiyoi.com" and (http.request.uri.path eq "/" or starts_with(http.request.uri.path, "/trips/") or starts_with(http.request.uri.path, "/destinations") or starts_with(http.request.uri.path, "/dates") or starts_with(http.request.uri.path, "/news") or http.request.uri.path in {"/find-trip" "/about"}))
   ```

3. Cache eligibility 選 **Eligible for cache**；Edge TTL 與 Browser TTL **都不要設定**（留給程式送的標頭決定）。
4. 存檔後連續開兩次同一頁，第二次回應標頭出現 `cf-cache-status: HIT` 就是生效了。

開啟後要知道的事：

- 業務在後台存檔後，前台最慢約 2 分鐘才看到新內容（60 秒過期後，Cloudflare 會先給一次舊頁面再更新）。
  急著確認時，在 Cloudflare 的 Caching → Configuration 按 Purge Everything。
- 想調整時間改 `lib/edge-cache.ts` 的 `edgeCacheSeconds`；想關掉就停用那條 Cache Rule，不必改程式。
- 可另外加一條規則把 `starts_with(http.request.uri.path, "/_next/image")` 設成 Eligible for cache，
  縮圖就不必每次回源重新產生。

## 本地預覽

需要 Node.js 24 以上版本，與 Docker 和 CI 一致。

```bash
npm install
npm run dev
```

再開啟 <http://localhost:3001>。

本機若未設定 Railway Bucket credentials，前台仍會顯示預設內容；後台儲存
與 PDF 上傳則會提示尚未啟用儲存空間。

## 品質檢查

```bash
npm test
npm run lint
```

GitHub Actions 會在每次推送及 Pull Request 自動執行建置、測試與 lint。Railway 可
開啟 **Wait for CI**，確認 GitHub Actions 成功後再自動發布。
