# Hold'em Academy（德州撲克學院）

一個純前端的德州撲克教學 / 練習網站。React 18 + Babel 走 CDN、瀏覽器端即時轉譯 JSX，**無 build step**，整個資料夾原樣即可當靜態網站部署。

## 本機預覽
直接用任意靜態伺服器開啟根目錄即可，例如：

```bash
npx serve .
```

然後瀏覽 `index.html`。

## 部署
託管於 Netlify，已連結本 repo：每次 `git push` 會自動重新部署。

- Build command：留空
- Publish directory：`.`（根目錄）

設定見 `netlify.toml`。

## 結構
```
index.html              入口與 script 載入順序（順序固定，勿更動）
styles.css              全站樣式 / design tokens
netlify.toml            Netlify 部署設定
src/
  app.jsx               路由與外殼（最後載入）
  data.jsx              教學內容資料
  engine/
    pokerEngine.jsx     發牌引擎（純 JS，須在 pokerAI 之前載入）
    pokerAI.jsx         對手 AI
    pokerExplain.jsx    GTO 解說 / 牌力分類 / 開池範圍
  pages/
    pageHome.jsx … pageGlossary.jsx   各教學分頁
    pageTable.jsx       練習桌（現金桌 / MTT）
  components/
    ui.jsx              共用 UI 元件（PlayingCard、Pill…）
    tweaks-panel.jsx    視覺調整面板
```

> 所有 `.jsx` 都是全域 script、彼此沒有 `import`，僅靠 `index.html` 的載入順序串接。
> 搬動檔案只需同步更新 `index.html` 的 `src=` 路徑；`pokerEngine.jsx` 不走 Babel（純 JS），其餘為 `type="text/babel"`。
