# 找到了旅行社網站

找到了旅行社業務團隊的公開形象官網與行程管理後台。

- 前台公開瀏覽，不需要 ChatGPT 或其他會員帳號
- `/studio` 使用核准 Email 與密碼登入
- 行程支援不限筆數；同一行程可建立多個航空／內容方案，各自上傳 PDF 或設定 Google Drive 分享連結
- 首頁使用公司 Logo、正式影片、天氣、當地時間與匯率工具
- `/contact` 公開聯絡表單，先存檔，再發送通知；失敗可重試，並在 `/studio/contacts` 查看狀態
- Railway 連接 GitHub `main` 後，每次推送會自動重新部署

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

## 網址與搜尋引擎

目前使用 `https://found-travel-website-production.up.railway.app`，`SITE_URL` 保持空白。
Railway 臨時網域維持禁止搜尋引擎索引。日後取得正式網域並完成 Railway DNS／TLS 設定後，
將 `SITE_URL` 設成 HTTPS origin（例如 `https://travel.example.com`，不含路徑）。
並確認 `RAILWAY_PUBLIC_DOMAIN` 為原 Railway 主機名稱；公開頁面會轉向正式網域，
API 與後台路徑維持原有路由。

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
