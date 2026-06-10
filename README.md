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
- `index.html` — 入口與 script 載入順序（**勿更動順序**）
- `styles.css` — 全站樣式 / design tokens
- `app.jsx` — 路由與外殼
- `ui.jsx` — 共用 UI 元件
- `data.jsx` — 教學內容資料
- `page*.jsx` — 各分頁
- `pokerEngine.jsx` / `pokerAI.jsx` / `pokerExplain.jsx` — 發牌引擎、對手 AI、解說邏輯
- `tweaks-panel.jsx` — 可選的調整面板
