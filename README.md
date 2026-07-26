# 找到了旅行社網站

找到了旅行社業務團隊的公開形象官網與行程管理後台。

- 前台公開瀏覽，不需要 ChatGPT 或其他會員帳號
- `/studio` 使用核准 Email 與密碼登入
- 行程支援不限筆數、PDF 上傳或 Google Drive 分享連結
- 首頁使用公司 Logo、正式影片、天氣、當地時間與匯率工具
- Railway 連接 GitHub `main` 後，每次推送會自動重新部署

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

## 新增業務的管理員帳號

要讓每位業務有自己的登入帳號，在網站 Service 的 Variables 加入
`STUDIO_USERS`，一行一組「Email:密碼」（也可用分號分隔多組）：

```text
STUDIO_USERS=amy@example.com:密碼至少8字元
bob@example.com:另一組密碼8字元
```

- 密碼至少 8 字元；不可包含換行、逗號或分號（可包含冒號）。
- 原本的 `STUDIO_ADMIN_EMAIL` / `STUDIO_ADMIN_PASSWORD` 仍然有效，
  會與 `STUDIO_USERS` 名單合併。
- 移除某一行後（Railway 改變數會自動重新部署），該帳號立即失效，
  已登入的 session 也會馬上作廢。
- 後台儲存內容時會記錄操作者 Email，可追溯是哪位業務更新的。
- 未設定 `STUDIO_SESSION_SECRET` 時，調整名單會讓所有人需要重新
  登入一次；建議加上固定的 `STUDIO_SESSION_SECRET` 避免此情況。

6. 部署完成後，進入 **Settings → Networking → Generate Domain**，
   取得免費的 `*.up.railway.app` 網址。

Railway Bucket 會保存首頁內容與 PDF，因此 GitHub 重新部署不會清除業務已
上架的資料。

## Railway Bucket 變數

網站同時支援 Railway Bucket 原始 credential 名稱及 Auto-inject 常見名稱：

- `BUCKET` 或 `BUCKET_NAME`
- `ENDPOINT` 或 `BUCKET_ENDPOINT`
- `ACCESS_KEY_ID` 或 `BUCKET_ACCESS_KEY_ID`
- `SECRET_ACCESS_KEY` 或 `BUCKET_SECRET_ACCESS_KEY`
- `REGION` 或 `BUCKET_REGION`

## 本地預覽

需要 Node.js 22.13 以上版本。

```bash
npm install
npm run dev
```

再開啟 <http://localhost:3001>。

本機若未設定 Railway Bucket credentials，前台仍會顯示預設內容；後台儲存
與 PDF 上傳則會提示尚未啟用儲存空間。

## 品質檢查

```bash
npm run build
npm test
npm run lint
```

GitHub Actions 會在每次推送及 Pull Request 自動執行建置與測試。Railway 可
開啟 **Wait for CI**，確認 GitHub Actions 成功後再自動發布。
