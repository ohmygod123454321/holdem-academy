# 部署說明：Hold'em Academy（德州撲克學院）

## 這是什麼
一個**已經能正常運作**的德州撲克教學 / 練習網站，純前端（無後端、無資料庫）。
所有狀態存在瀏覽器 localStorage，直接當靜態網站部署即可。

**重要：這不是設計稿，是可直接上線的成品。** 不需要重寫，目標就是：
1. 把它部署到一個靜態託管服務，取得一個**永久網址**；
2. 設定成「改完原始碼後自動重新部署」(CI auto-deploy)，讓使用者之後在這個 repo 裡迭代即可。

## 技術架構（請先讀懂再動）
- 入口是 `index.html`。
- React 18 + Babel **走 CDN，在瀏覽器端即時轉譯** JSX。
  - 也就是說：`.jsx` 檔是用 `<script type="text/babel" src="...">` 直接載入的，**不需要 build step**，把整個資料夾原樣丟上靜態主機就能跑。
- 樣式在 `styles.css`，設計 token（撲克牌桌綠 + 金）都在最上面的 `:root`。
- 載入順序很重要，已寫死在 `index.html` 的 `<script>` 區塊，**不要更動順序**（`pokerEngine.jsx` 必須在 `pokerAI.jsx` 之前，`app.jsx` 最後）。

### 檔案清單
- `index.html` — 入口與載入順序
- `styles.css` — 全站樣式 / design tokens
- `app.jsx` — 路由與外殼
- `ui.jsx` — 共用 UI 元件
- `data.jsx` — 教學內容資料
- `page*.jsx` — 各分頁（首頁、規則、位置、起手牌、賠率、籌碼、錦標賽、練習、回放、GTO、術語、牌桌）
- `pokerEngine.jsx` / `pokerAI.jsx` / `pokerExplain.jsx` — 發牌引擎、對手 AI、解說邏輯
- `tweaks-panel.jsx` — 可選的調整面板（非必要）

## 部署方式（擇一）

### 選項 A — Netlify（最簡單，推薦）
因為沒有 build step，設定極簡：
1. 把本資料夾推到一個 GitHub repo。
2. Netlify → Add new site → Import from Git → 選該 repo。
3. Build command 留空；Publish directory 設為 `/`（根目錄）。
4. Deploy。之後每次 `git push` 都會自動重新部署 → **這就是使用者要的「改了自動同步」**。

CLI 版本（如果你直接在本機操作）：
```bash
npm i -g netlify-cli
netlify deploy --prod --dir .
```

### 選項 B — Vercel
1. 推到 GitHub repo。
2. Vercel → New Project → Import repo。
3. Framework Preset 選 **Other**；Build command 留空；Output directory 設 `.`。
4. Deploy。同樣 push 即自動部署。

### 選項 C — Cloudflare Pages / GitHub Pages
皆可，設定相同：無 build command、輸出根目錄。

## 可選的優化（非必要，使用者沒要求就先別做）
- 目前用的是 React/Babel 的 **development** CDN 版，瀏覽器端轉譯在低階手機上會稍慢。若要更快，可改成 production 版並導入正式 build（Vite）做預先轉譯——但**這會改變專案結構，動之前請先跟使用者確認**。
- 字型走 Google Fonts CDN；若擔心離線或牆，可自行 self-host。

## 注意
- 不要把 `.jsx` 的載入順序打亂。
- 不要刪 `scraps/`、`.thumbnail` 以外的任何 `.jsx`，每個都是有用的分頁。
- 這份是一次性快照；交接後請以本 repo 為唯一源頭繼續開發。
