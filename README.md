# KV

Dennis 建立的 AI Agent／營運後台系統，目前由工程團隊在原專案上漸進產品化。前端 UI／UX 與既有資料格式維持不變，後端逐步整理成可維護、可測試、可擴充的 domain、workflow、runtime、repository 與 provider boundaries。

## 開發環境

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

打開 [http://localhost:3000](http://localhost:3000)。

受保護頁面需要：

- `AUTH_SECRET`
- `ADMIN_PASSWORD`

真實後台資料另需：

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

依實際測試的功能再加入 OpenAI、LINE、Google 或 Teachify credentials。`.env.local` 已被 Git 忽略，不得提交 secrets。

## 驗證

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run verify:full
```

`verify:full` 的 browser smoke 不等於真實功能 E2E；需要登入、資料庫或外部 provider 的 journey 必須使用對應環境另行驗證。

## 重構文件

- [產品化重構 TODO](./docs/PRODUCTIZATION_TODO.md)：唯一執行計畫、進度表與 domain-level source map。

不要新增逐 route contract、micro-checkpoint 或平行計畫。行為契約放在 tests，symbol/consumer 影響以 CodeGraph 即時查詢。
