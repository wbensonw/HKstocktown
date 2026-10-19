# 把恆指大茶樓放到網上

這份說明給第一次用 GitHub 和 Cloudflare 的人。做完之後，別人可以用一個網址打開茶樓。你自己的電腦仍然用 `npm run dev`。

先記住兩件事：

- **GitHub Pages** 負責放茶樓的畫面（按鈕、3D、圖表）。它不會幫你向騰訊拿股價。
- **Cloudflare Worker** 負責代拿股價，再交給網頁。瀏覽器不能自己去騰訊拿，所以一定要有這個 Worker。

請先做 Worker，再做 GitHub。順序反了的話，網頁會先出來，但左上角會寫「模擬數據」。

## 你需要準備

1. 這個專案已經能在自己電腦用 `npm run dev` 打開。
2. 一個免費的 [GitHub](https://github.com/) 帳號。
3. 一個免費的 [Cloudflare](https://dash.cloudflare.com/sign-up) 帳號。用電郵註冊即可，不用綁信用卡。
4. 已安裝 [Git for Windows](https://git-scm.com/download/win)。安裝時一直按下一步即可。裝完後關掉終端機再打開。

在專案資料夾打開 PowerShell，輸入 `git --version`。看得到版本號就可以繼續。

## 第一步：把報價程式放到 Cloudflare

1. 打開 PowerShell，進入專案資料夾。例如：

```powershell
cd C:\Cursor_projects\stocktown
```

2. 登入 Cloudflare。輸入：

```powershell
npx wrangler login
```

瀏覽器會打開 Cloudflare。登入後按 **Allow**（允許）。終端機出現 `Successfully logged in` 就是成功。

3. 發布 Worker。輸入：

```powershell
npx wrangler deploy
```

第一次可能會問要不要建立專案，選是。完成後終端機會印出一行網址，樣子像：

`https://hk-teahouse-api.你的帳號.workers.dev`
https://hk-teahouse-api.wbensonw.workers.dev


把這整行抄下來。不要在後面加上 `/api/market`，也不要留最後的 `/`。

4. 用瀏覽器打開 `https://hk-teahouse-api.你的帳號.workers.dev/api/market`。看得到一大段 JSON、裡面有恆指價格，就代表 Worker 已在線。如果是錯誤頁，回到終端機看紅色字，再執行一次 `npx wrangler deploy`。

## 第二步：把專案放到 GitHub

1. 用瀏覽器打開 [https://github.com/new](https://github.com/new)。
2. **Repository name** 填一個英文名字，例如 `stocktown`。不要空格。
3. 選 **Public**。Private 也可以，但免費 Pages 用公開倉庫最省事。
4. 不要勾選 Add a README。下面的 .gitignore 和 license 也留空。按 **Create repository**。
5. GitHub 會給你一頁指令。先不要關。回到 PowerShell，確認你在 `C:\Cursor_projects\stocktown`，然後逐行輸入（把網址換成 GitHub 那頁的網址）：

```powershell
git init
git add .
git commit -m "第一版：恆指大茶樓"
git branch -M main
git remote add origin https://github.com/你的使用者名稱/stocktown.git
git push -u origin main
```

瀏覽器或視窗可能要求登入 GitHub。登入後再推一次。`git push` 沒有紅色錯誤，到 GitHub 倉庫頁能看到 `src`、`worker`、`README.md`，就是成功。

如果 `git commit` 說要先設定名字，只做這一次：

```powershell
git config --global user.name "你的名字"
git config --global user.email "你的GitHub電郵"
```

然後再執行上面的 `git commit` 和後面的指令。

## 第三步：告訴網頁 Worker 的網址

1. 打開你的 GitHub 倉庫。
2. 上方按 **Settings**。
3. 左邊找到 **Secrets and variables**，點開，再按 **Actions**。
4. 上方有 **Secrets** 和 **Variables** 兩個分頁。按 **Variables**。
5. 按 **New repository variable**。
6. Name 填 `MARKET_API`。必須完全一樣，全部大寫。
7. Value 貼上第一步抄下的 Worker 網址，例如 `https://hk-teahouse-api.你的帳號.workers.dev`。不要加 `/api/market`。
8. 按 **Add variable**。

## 第四步：打開 GitHub Pages

1. 還是在倉庫的 **Settings**。
2. 左邊按 **Pages**。
3. **Build and deployment** 下面的 **Source**，選 **GitHub Actions**。

如果第二步的 `git push` 已經做過，GitHub 可能已經開始建置。到倉庫上方的 **Actions** 分頁，點最新的一項 **Deploy static content to Pages**。

- 綠色勾：成功。
- 紅色叉：點進去看哪一步失敗。最常見是還沒選 GitHub Actions，或 `npm ci` 失敗。選好 Source 後，在該次執行右邊按 **Re-run jobs**。

你是在設定 `MARKET_API` 之前就 push 的話，一定要再跑一次：Actions 頁打開那次工作流程，右上角 **Re-run jobs**。不然網頁還不知道 Worker 在哪。

完成後，Pages 設定頁會出現網址：

`https://你的使用者名稱.github.io/stocktown/`

用瀏覽器打開。第一次可能要等一分鐘。

## 第五步：確認股價是真的

左上角「恆指大茶樓」下面的小字：

- 寫 **騰訊財經**：成功，數字來自 Worker。
- 寫 **模擬數據**：網頁沒有連上 Worker。依序檢查：
  1. 瀏覽器直接打開 `你的Worker網址/api/market`，要看得到 JSON。
  2. GitHub 的 `MARKET_API` 變數沒有多加 `/api/market`，也沒有空格。
  3. 改完變數後，到 Actions 再按一次 **Re-run jobs**。只改變數不會自動重新發布。

## 以後改了程式

在自己電腦確認 `npm run dev` 沒問題後：

```powershell
git add .
git commit -m "說明你改了什麼"
git push
```

推上去之後，Actions 會自動再發布一次。Worker 的程式若沒改，不用重新 `npx wrangler deploy`。只有改了 `worker` 或 `src/services/quotes.js` 這類報價程式，才要再執行 `npx wrangler deploy`。

## 自己電腦照舊

```powershell
npm install
npm run dev
```

打開 [http://127.0.0.1:5173/](http://127.0.0.1:5173/)。本機不需要 Cloudflare，也不讀 `MARKET_API`。
