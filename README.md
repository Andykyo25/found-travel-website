# 找到了旅行社網站

找到了旅行社業務團隊的形象官網與行程管理後台。

- 正式網站：<https://found-travel-studio.workspace-567072.chatgpt.site>
- 後台入口：<https://found-travel-studio.workspace-567072.chatgpt.site/studio>
- 前台公開瀏覽，後台需使用 ChatGPT 登入並通過 Email 授權
- 行程支援不限筆數、PDF 上傳或 Google Drive 分享連結

## 本地預覽

需要 Node.js 22.13 以上版本。

```bash
npm install
npm run dev -- -p 3001
```

再開啟 <http://localhost:3001>。

Windows 使用者也可以直接雙擊專案根目錄的 `開啟本地網站.cmd`。

## 內容管理

正式後台使用 Sites 提供的 ChatGPT 登入。可編輯 Email 由正式環境的
`SITE_EDITOR_EMAILS` 管理，多個 Email 使用逗號分隔。

行程 PDF 儲存在 R2，網站內容與編輯者資料儲存在 D1。這些服務由 Sites
部署環境提供，因此 GitHub Pages 無法完整執行本專案。

## GitHub Actions

每次推送或建立 Pull Request 時，GitHub Actions 會自動執行建置與測試。
Actions 用於品質檢查；正式網站仍由 Sites 提供主機、登入、資料庫及檔案儲存。

## 常用指令

```bash
npm run dev -- -p 3001
npm run build
npm test
```
