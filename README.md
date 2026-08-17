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
npm run test:e2e:run:staging
```

`verify:full` 的 browser smoke 不等於真實功能 E2E；需要登入、資料庫或外部 provider 的 journey 必須使用對應環境另行驗證。
`test:e2e:run:staging` 會載入 Git ignored `.env.local` 驗證真實 Main read paths；會寫入 Main 的 integration／acceptance 一律維持 opt-in gate，執行後必須確認 fixture cleanup，詳細 gate 與證據只維護在 `docs/LUNA_PRODUCTIZATION_EXECUTION_PLAN.md`。

## Release 與 rollback

KV 採「先做相容的 forward migration，再部署同一個 commit」；release 不會自行猜測目標 Supabase，也不會自動執行 migration。`SUPABASE_DB_URL`、project ref 與下列 release metadata 只放 `.env.local` 或部署 secret store。

```powershell
$kvReleaseCommit = git rev-parse HEAD
$kvSchemaFile = Get-ChildItem supabase/migrations/*.sql | Sort-Object Name | Select-Object -Last 1
$env:KV_RUNTIME_ENV = "staging"
$env:KV_COMMIT_SHA = $kvReleaseCommit
$env:KV_SCHEMA_VERSION = $kvSchemaFile.BaseName.Split("_")[0]

npm run release:preflight -- --profile=staging
npm run schema:rehearse
npm run schema:types:check
npm run release:migrations:plan -- --profile=staging
```

`migration-plan` 只執行 migration history 比對與 `db push --dry-run`。確認 Supabase backup／PITR 或可還原 snapshot 已存在後，才允許 apply：

```powershell
$env:KV_RELEASE_BACKUP_CONFIRMED = "1"
$env:KV_RELEASE_MIGRATION_APPLY = "1"
npm run release:migrations:apply -- --profile=staging --confirm-project=$env:KV_STAGING_PROJECT_REF
```

接著由指定 release owner 部署上述 exact commit，並讓部署環境使用相同的 `KV_RUNTIME_ENV`、`KV_COMMIT_SHA`、`KV_SCHEMA_VERSION`。部署完成後：

```powershell
$env:APP_BASE_URL = "https://<isolated-staging-host>"
npm run release:verify -- --profile=staging
```

`release:verify` 會比對 `/api/version` 的 commit、schema version、environment，並要求 `/api/health` 回 ready。任何一項不一致都停止 promotion。

Main Supabase 的 logical backup、restore rehearsal 與應用排程使用同一支 release CLI。Backup 必須放在 repo 外；Storage object bytes 不包含在 `pg_dump`，若環境開始使用 Supabase Storage，必須另外驗證 platform backup／PITR 與 object recovery。

```powershell
$backup = "F:\ownproject\kv-backups\kv-staging-$(Get-Date -Format yyyyMMdd).dump"
npm run release:backup:create -- --profile=staging --output=$backup
npm run release:backup:verify -- --input=$backup
npm run release:backup:rehearse -- --profile=staging --input=$backup

npm run release:schedules:plan -- --profile=staging
$env:KV_RELEASE_SCHEDULE_APPLY = "1"
npm run release:schedules:apply -- --profile=staging --confirm-project=$env:KV_STAGING_PROJECT_REF
npm run release:schedules:verify -- --profile=staging
```

正式 recurring jobs 由 Supabase Cron 執行；`.github/workflows/frequent-jobs.yml` 只是人工 fallback，不會自動排程。排程失敗由 CabLate release owner 先查 Supabase Cron history、`kv_ops.schedule_dispatches` 與 `pg_net` response；目前沒有另外建立通用告警框架。

Rollback 分成兩件事：

- Application rollback：重新部署上一個已驗證的 immutable commit，再重跑 `release:verify`。
- Database recovery：目前 migration 是 additive／forward-only；一般錯誤用新的 forward-fix migration，不執行 remote `db reset` 或擅自 migration down。只有資料受損時，才由 DB owner 使用已確認的 backup／PITR 還原，並部署與該 schema 相符的 commit。

Zeabur 免費方案若不提供一鍵 rollback，application rollback 仍以同一 service 重新部署指定 immutable commit 完成；不得把手動修改 `/api/version` metadata 當成 rollback。每次正式發版前，至少在隔離程序驗證「上一版 app + 新 additive schema」的 build、health 與 version contract。

若未來 migration 會刪欄位、改型別或破壞舊版相容性，這套順序不適用，必須先另訂 coexistence、backfill、cutover 與 restore rehearsal。

## 重構文件

- [產品化接續執行計畫](./docs/LUNA_PRODUCTIZATION_EXECUTION_PLAN.md)：唯一執行計畫、進度表與 acceptance ledger。
- [歷史產品化盤點](./docs/PRODUCTIZATION_TODO.md)：精簡封存指標；完整歷史由 Git 保存，不再決定後續順序。

不要新增逐 route contract、micro-checkpoint 或平行計畫。行為契約放在 tests，symbol/consumer 影響以 CodeGraph 即時查詢。
