# 下一件事 NextUp

一個 local-first 的生活週期管理 App，專門管理「該續、該換、該繳、該處理」的事情，而不是一般待辦清單。

## 目前版本：0.3.2

### 0.3.2 — Final Reliability Patch

延續 0.3.1，這次修的是通知與 Migration 的邊界情況：

- **過期提醒時間會告知使用者**：原本「提醒時間已經過去所以跳過排程」（`skippedPast`）完全不會顯示警告，使用者會誤以為提醒設定成功。現在會依情況分別提示「部分提醒時間已經過了，未能排程」或「目前沒有可排程的未來提醒，請調整提醒天數或日期」，跟「排程 API 真的失敗」用不同文案區分。
- **Notification／DB 一致性回滾**：系統通知排成功、但寫入資料庫的 notification_id 失敗時，會自動取消剛剛排好的系統通知，不留下 App 追蹤不到的幽靈通知。
- **編輯失敗的通知補償**：修改事項或提醒天數時，會先取消舊通知再寫資料庫；如果資料庫寫入失敗，會把舊通知重新排回去，不會讓一次失敗的編輯順便毀掉原本正常的提醒。
- **通知開關的加總警告**：打開「到期提醒」總開關會重新排程所有事項，如果其中有些排程失敗或提醒時間已過，開關仍會維持開啟（尊重使用者意圖），但會用 Snackbar 告知。
- **冷啟動通知讀取後會清除**：點通知冷啟動 App 導頁完成後，會呼叫 `clearLastNotificationResponseAsync()`，避免下次啟動又重複消費同一則舊通知。
- **點通知前先確認事項還在**：如果對應事項已被刪除，改為導回首頁而不是顯示「找不到項目」。
- **更穩固的 SQLite Migration**：schema 變更跟 `PRAGMA user_version` 現在在同一個 transaction 內完成，不會出現「欄位建好但版本號沒更新」的中間態；就算真的曾經卡在這個中間態，migration 也會用「欄位存在就跳過」的方式安全補完，不會整個 App 打不開。
- **Reconciliation 同步 stale ID**：App 啟動校正時，如果通知其實還活著、但資料庫存的 notification_id 對不上系統實際的 ID，會直接更新資料庫回到正確值。
- 通知固定於**每天上午 9:00** 發送（新增頁提醒區有低調提示）。

### 0.3.1 — Reliability Fix

這一版不加新功能，只修正「日期不能錯一天、週期不能漂移、Undo 必須準確、提醒關閉就真的不能發」：

- **本地時區日期**：完成事項、顯示完成紀錄時，不再對 UTC timestamp 做 `.slice(0, 10)`（在台灣時區晚上會被切成前一天），統一改用 `timestampToLocalIsoDate()` 依裝置本地時間換算。
- **Anchor Day 不會被無關的編輯動掉**：只有真的修改到期日，才會重新計算 anchor day；改備註、分類、提醒都不會動到它。
- **Undo 精確還原**：完成事項時會把「完成前的 dueDate / anchor day / completedAt / lastCompletedAt」寫進完成紀錄，Undo 直接還原這份快照，不再從 scheduled date 反推（v0.3.0 之前的舊紀錄沒有這份快照，Undo 時會退回舊的反推邏輯）。
- **提醒開關是真正的全域開關**：新增、編輯、完成、Undo、修改提醒時都會先檢查「到期提醒」是否開啟，關閉時一律不排程系統通知（但提醒天數資料照樣保留）；首次安裝預設關閉，使用者主動打開才會請求系統權限。
- **修改提醒時不留下 Ghost Notification**：修改到期日／週期／提醒天數前，會先用「修改前」的通知 ID 取消舊通知，避免資料庫覆蓋掉 ID 後留下永遠不會被取消的系統通知。
- **提醒排程失敗會告訴你**：排程失敗不再只是 `console.error`，會回傳排程結果，儲存成功但提醒排程失敗時會用 Snackbar 提示，不會讓使用者誤以為都設定好了。
- **允許 0 個提醒**：取消所有提醒後不會再偷偷補回 7 天。
- **一次性事項完成後找得回來**：「事項」頁新增「進行中／已完成」切換。
- **點通知直接開對應事項**：不管 App 在前景、背景或冷啟動被喚醒，點提醒通知都會直接進入該事項的詳情頁。

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
