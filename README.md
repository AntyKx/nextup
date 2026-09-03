# 下一件事 NextUp

一個 local-first 的生活週期管理 App，專門管理「該續、該換、該繳、該處理」的事情，而不是一般待辦清單。

## 目前版本：0.2.0 UI Preview

- 30 天內待處理摘要
- 依到期日排序的生活時間軸
- 證件、車輛、居家、3C、帳務、旅行分類
- 快速範本與自訂新增
- 提前提醒天數資料
- 每月、每季、每年週期
- 完成一次性事項後歸檔
- 完成週期事項後自動推進下一期
- 手機端使用本機檔案保存；Web 預覽使用 localStorage
- 暖灰與灰綠色的生活感 Design System
- iOS SF Symbols／Android Material Symbols 跨平台圖示
- 無 Emoji、低陰影、低卡片密度的主流消費型 App 介面

> 系統通知尚未接入。待 `expo-notifications` 可安裝後，應在新增、修改、完成事項時重新排程本機通知。

## 技術架構

- Expo SDK 57
- React Native 0.86
- Expo Router
- TypeScript
- local-first 儲存介面（目前 File System；可替換為 SQLite）

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
EXPO_OFFLINE=1 npx expo export --platform web
EXPO_OFFLINE=1 npx expo export --platform android
```

## 下一階段

1. 接入 `expo-notifications`，完成實際本機提醒與重新排程。
2. 加入事項詳情、編輯、刪除與完成紀錄。
3. 改用 `expo-sqlite` 並建立 migration。
4. 加入照片／收據附件與 OCR 日期辨識。
5. Widget、備份與付費方案。
