# 下一件事 NextUp

一個 local-first 的生活週期管理 App，專門管理「該續、該換、該繳、該處理」的事情，而不是一般待辦清單。

## 目前版本：0.3.0

### 資料與提醒

- 手機端改用 **expo-sqlite** 儲存（`life_items` / `reminders` / `completion_history` / `app_settings` 四張表），有 schema migration（`PRAGMA user_version`）；Web 預覽維持 localStorage，但改成不可變更新，畫面會即時反映每次異動。
- 舊版單一 JSON 快照（`nextup-snapshot.json`）會在第一次啟動時自動搬進 SQLite，搬完才把舊檔改名保留，絕不刪除。
- 一個事項可以設定**多個提醒天數**（例如護照同時設 180/90/30/7 天前），改用 **expo-notifications** 排程真正的本機通知；新增、修改、完成、復原、刪除都會同步取消／重新排程，App 啟動時也會做一次通知校正。
- 完整**完成紀錄**：每次完成都留下一筆「原訂日期 → 實際完成日期」，用來看是否準時處理，不再只有一個 `lastCompletedAt`。

### 週期事項

- 修正月底溢位問題：用「anchor day」記住原本想要的日期（例如 31 號），短月自動取當月最後一天，下次遇到大月又會回到 31 號。
- 新增**週期起算方式**：
  - **固定週期**（保險、證件、牌照）：即使拖到逾期好幾期才完成，也會直接跳到下一個「真正的未來日期」，不會卡在過去。
  - **完成後才起算**（濾芯、耗材、保養）：以實際完成當天為新起點往後推。

### 互動

- 事項卡片整張可點擊進入**詳情頁**，右側打勾只完成不進詳情；詳情頁可查看、編輯、完成、刪除，並列出最近幾筆完成紀錄。
- 新增／編輯共用同一個表單元件，日期改用原生日期選擇器，提醒天數改成可複選 + 自訂天數；次要欄位（週期、起算方式、備註）收進「更多設定」。
- 完成事項後會跳出「已完成／復原」提示，數秒內可以一鍵撤銷，不怕手滑。
- 首頁把「已逾期」和「未來 30 天」分開計算與顯示，不會再把逾期事項誤算進 30 天內、也不會把逾期顯示成「0 天後」。

### 其他

- 證件、車輛、居家、3C、帳務、旅行分類，暖灰與灰綠色的生活感 Design System 維持不變。
- iOS SF Symbols／Android Material Symbols 跨平台圖示；無 Emoji、低陰影、低卡片密度。

## 技術架構

- Expo SDK 57 / React Native 0.86 / Expo Router / TypeScript
- `src/features/database`：SQLite 連線與 migration
- `src/features/life-items`：domain types、日期與週期演算法（`date-utils.ts`，純函式、無 RN 依賴）、repository（native 用 SQLite、web 用 localStorage）、service（協調 repository 與通知）、thin Context
- `src/features/notifications`：本機通知排程 / 取消 / 重新排程 / 校正

## 啟動

```bash
npm install
npm start
```

接著用 Expo Go 掃描 QR Code，或執行：

```bash
npm run android
npm run ios
npm run web
```

## 驗證

```bash
npx tsc --noEmit
npm run lint
npm run test
EXPO_OFFLINE=1 npx expo export --platform web
EXPO_OFFLINE=1 npx expo export --platform android
```

`npm run test` 用 `tsx` 直接跑 `date-utils.ts` 的 `node:test` 單元測試，涵蓋月底溢位、閏年、固定週期／完成後起算、逾期天數等情境。

## 下一階段

1. 在真機（Expo Go 或 dev build）上實際驗證通知準時送達。
2. 加入照片／收據附件與 OCR 日期辨識。
3. Widget、備份與付費方案。
