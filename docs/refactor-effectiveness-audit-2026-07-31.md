# KV 重構效能與有效性稽核（2026-07-31）

## 文件目的

這份文件記錄 2026-07-31 約十小時漸進重構後的實際成果、程式碼膨脹、
測試證據強度、登入環境漂移，以及後續修正路線。

它是 corrective audit，不取代：

- `docs/refactor-checkpoints.md` 的 commit ledger；
- `D:/_CabLate_Agents/coder/projects/kv/productization-plan.md` 的 canonical plan；
- `D:/_CabLate_Agents/coder/projects/kv/source-to-target-code-map.md` 的 source mapping。

本文件校正上述 ledger 中過強的 `Verified` 解讀：除非另有真實資料與互動證據，
既有 checkpoint 主要證明結構、contract、static/build 與 render smoke，
不等於完整產品功能已驗證。

## Executive verdict

1. 這批工作不是全部無效。大型 route 已縮小，複雜 Visit／Meeting／Orders／
   Reporting orchestration 已有可測試的 application owner，大量既有資料格式與
   side-effect ordering 已被 characterization tests 鎖定。
2. 施工策略確實過度偏向 route-specific
   `rules / ports / application / adapter` 四件套，產生大量單 consumer、
   pass-through 檔案與重複文件。
3. 十小時內 188 個 commit、79 個 docs commit、109 個 refactor commit，
   顯示「每階段 commit」被切得過細；時間花在 micro-checkpoint，而不是主要
   Runtime／projection／identity／cutover critical path。
4. 目前 130 個 Playwright smoke cases 主要證明 redirect、render、401 與
   no-page-error，不證明核心畫面功能可操作。
5. 原產品化完成度應保守修正為約 25–30%，而不是依 checkpoint 數量推算。
6. 後續必須先恢復可重現的 authenticated local environment，接著做
   domain-level consolidation；暫停新增 route-specific 四件套。

## 登入環境與先前後台存取的證據

### 已知事實

- 使用者提供的 2026-07-31 對話截圖明確記錄先前執行過：
  - 建接本機前端；
  - 檢視首頁展示；
  - 進入本機後台；
  - 檢視管理後台；
  - 確認後台登入；
  - 確認後台總覽畫面；
  - 盤點主要產品畫面；
  - 確認核心互動畫面。
- 當時的回報也記載，前端不是單一 dashboard，而是公開銷售網站、內部管理
  控制台與沉浸式簡報／會議展示三套體驗。
- 目前 `F:/ownproject/kv` 與其上一層沒有任何 `.env*` 檔案。
- `.gitignore` 已忽略 `.env*`。
- 目前 `http://localhost:3000/api/auth/login` 對任意非空密碼回：
  - HTTP 500；
  - `伺服器尚未設定登入密碼（AUTH_SECRET / ADMIN_PASSWORD）`。
- 目前 port 3000 的 Next dev server 自 2026-07-31 03:14 起持續運行。
- 正常登入與 session 驗證都要求 `AUTH_SECRET`；密碼驗證要求
  `ADMIN_PASSWORD`。
- Playwright 的 port 3100 server 會由 `playwright.config.ts` 注入測試用
  `AUTH_SECRET` 與 `ADMIN_PASSWORD`，並由 test helper 建立 signed cookie。

### 正確判讀

使用者沒有記錯；先前確實曾有「可進入後台」的操作與回報。現在無法從現有
證據確定當時使用的是：

1. port 3100、帶測試 env 的 Playwright server；
2. 另一個帶 env 的本機 server；
3. 另一個已簽 session 的 browser context；
4. 另一個部署環境。

截圖沒有保存 URL、port、cookie 來源、登入 request/response 或當時 server
environment，因此不能把先前成功與目前 port 3000 混為同一個可重現環境。

這是一項正式的 **environment drift / evidence gap**，不是「從來沒有登入成功」。

### 必要修正

建立不含秘密值的 `.env.example`，並由本機建立 ignored `.env.local`：

```dotenv
AUTH_SECRET=
ADMIN_PASSWORD=
APP_BASE_URL=http://localhost:3000
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
# SUPABASE_ANON_KEY=
```

登入只需前兩項；讀取真實後台資料還需要 Supabase。Visit 完整流程另外需要
OpenAI、LINE、Google 等 provider credentials。

新的 authenticated baseline 必須保存：

- URL 與 port；
- server 啟動方式；
- env key presence（不可記錄 secret value）；
- 登入 request status；
- dashboard 與核心頁面 screenshot／DOM；
- 實際 interaction results；
- 資料來源是 fixture、local DB、staging 或 production-like。

## 程式碼成長

基準為 merge base
`359d4c98035267df2711a376a439fdbc5720cc76`。

| 區域 | 基準 | 目前 | 增量 |
|---|---:|---:|---:|
| Production `src` files | 202 | 482 | +280 |
| Production `src` lines | 31,816 | 38,267 | 約 +6,451 |
| Tests files / lines | 0 / 0 | 202 / 9,876 | +202 / +9,876 |
| Docs files / lines | 0 / 0 | 81 / 7,566 | +81 / +7,566 |
| `src + tests` lines | 31,816 | 48,143 | +16,327 |
| `src + tests + docs` lines | 31,816 | 55,709 | +23,893 |

Git diff：

| Bucket | Files | Added | Deleted | Net |
|---|---:|---:|---:|---:|
| `src` | 343 | 8,946 | 2,473 | +6,473 |
| `tests` | 214 | 9,876 | 0 | +9,876 |
| `docs` | 81 | 7,567 | 0 | +7,567 |
| CI | 1 | 44 | 0 | +44 |
| Other | 7 | 6,545 | 4,372 | +2,173 |
| Total | 646 | 32,978 | 6,845 | +26,133 |

`other` 主要是 `package-lock.json` 的 6,417 additions / 4,369 deletions。

因此：

- production code 尚未超過四萬行；
- production + tests 已約 4.8 萬行；
- 加入 docs 已約 5.6 萬行。

## 新架構表面積

| Pattern | Files | Lines |
|---|---:|---:|
| `*-rules.ts` | 46 | 1,236 |
| `*-ports.ts` | 65 | 849 |
| `*-application.ts` | 61 | 2,150 |
| `legacy-*-adapter.ts` | 67 | 1,213 |
| All `src/modules` | 197 | 6,040 |
| All `src/adapters` | 72 | 1,578 |
| `src/platform` | 11 | 521 |

檔案厚度：

- modules median：17 lines；
- adapters median：14 lines；
- 125 個 module／adapter 不超過 15 lines；
- 184 個不超過 25 lines，占 269 個 module／adapter 約 68%；
- 不超過 25 lines 的檔案合計 2,318 lines；
- 81 個 CRUD-like route-specific files 合計 1,309 lines。

### 有效的抽離

以下情況值得保留：

- 有兩個以上 consumer 的 domain boundary；
- 外部 provider translation；
- legacy row / payload mapping；
- transaction、idempotency、retry、lease、outbox；
- 有多個 side effects 與 failure semantics 的 application orchestration；
- 能讓 complex route 減少 direct DB / provider ownership。

代表例：

- Contact tag adapter 被 LINE webhook、Visit timeout、TV、Meeting 使用；
- Conversation lock 被 webhook 與 timeout 使用；
- Visit workflow／delivery ports 同時服務 webhook 與 timeout；
- Visit offer application 有多個 provider、persistence、runtime、delivery 與
  failure branches。

### 過度抽離

以下情況應合併：

- application 只做 `return port.method(input)`；
- port 只有一個 method、一個 consumer，底層 helper 已是穩定 boundary；
- adapter 只做 `{ method: existingHelper }`；
- route-specific CRUD operation 各自建立 rules／ports／application／adapter；
- 每個微型 route 都有獨立 contract 文件。

Knowledge Base create 是代表案例：

- `create-rules.ts`：44 lines；
- `create-ports.ts`：6 lines；
- `create-application.ts`：10 lines，只 delegate；
- `legacy-create-adapter.ts`：7 lines，只 alias；
- CodeGraph 顯示 application 與 adapter 都只有 Knowledge Base route consumer。

這類結構沒有建立真正替換能力，主要增加 navigation 與命名成本。

## 原先三項效率警告的結論

| 警告 | 是否為真 | 實際改善程度 |
|---|---|---|
| 每個 route 切四件套，造成模組膨脹 | 是，而且已成系統性問題 | 只有 WP6-BT timeout 做局部 consolidation，尚未回頭整理 |
| API-only 改動只重複驗證 catalog，訊號低 | 是 | 後來增加一個 catalog click 與一次後台導覽，但未建立 env，仍未完成真實功能驗證 |
| Thin legacy adapters 是刻意 compatibility boundary | 部分為真 | shared mapping/provider adapters 有價值；大量 single-consumer pass-through adapters 無充分理由 |

後續不能只宣稱「會改善」。必須先做 consolidation checkpoint，再繼續其他
architecture migration。

## 測試證據強度

### 已有證據

- 191 Vitest files / 566 tests；
- lint、typecheck、production build；
- 93 generated pages；
- 130 Playwright smoke cases；
- 6 representative visual surfaces、desktop/mobile 共 12 snapshots；
- CodeGraph + `rg` source mapping；
- 多數新 application／adapter 有 focused unit tests。

### 130 smoke cases 實際證明什麼

主要 assertions：

- anonymous protected page redirect 到 `/login`；
- synthetic signed cookie 後 protected page 可 render；
- document status `< 500`；
- body visible；
- body 不包含 `Application error`；
- 沒有 uncaught page error；
- session API 對 anonymous request 回 401。

`verify:full` 使用 `grep-invert @visual`，不執行 screenshot comparison。

### 沒有證明什麼

- 真實密碼登入；
- 真實 Supabase data loading；
- 表單新增／編輯／刪除／儲存；
- Knowledge import／publish／reindex；
- Visit 名片、offer、approval、invite、timeout；
- Meeting command／voice／finish；
- Goals／Subscribers／Checklist 寫入；
- LINE、Google、OpenAI provider side effects；
- 完整 product journey。

`PRODUCT_JOURNEYS` 目前是結構 fixture；其 unit tests 驗證 ID、entrypoint 與
failure-description presence，不會真的執行 journey。

因此現有 `Verified` 必須拆成：

1. `Structurally verified`
2. `Contract tested`
3. `Render smoke passed`
4. `Functionally verified`
5. `Production-like verified`

目前多數 checkpoint 只到前三層。

## 修正後完成度

| 面向 | 約略完成度 |
|---|---:|
| 現況盤點／contract／測試骨架 | 70–80% |
| Route logic extraction | 60–70%，但需要 consolidation |
| Runtime persistence／outbox／CAS | 20–30% |
| Visit／Orders／Reporting new-path cutover | 20–30% |
| Offering／Role／Instance／Presentation | <10% |
| Runtime projection／UI data source | <10% |
| Real functional E2E／canary／cleanup | 接近 0% |

依原始產品化 `Done When`，整體應估約 25–30%。

## 立即生效的施工規則

1. 暫停新增 route-specific 四件套。
2. 新 port 必須至少符合一項：
   - 兩個以上 consumer；
   - external provider；
   - transaction／retry／lease／outbox boundary；
   - 有明確且近期的替換計畫。
3. 單純 delegate application 合併到 domain service 或 route composition。
4. Adapter 必須負責 mapping、translation、transaction 或 resilience；
   純 alias 不單獨成檔。
5. 一個 domain 維護一份 behavior contract；微型 route 行為放 mapping ledger。
6. 一個 commit 對應一個可驗收 business/domain outcome，不再以新增小檔案為
   stage。
7. 每批 Chrome evidence 必須包含 affected authenticated surface 的真實
   interaction；catalog 只作 global sanity check。
8. 進度以 completed business journey、cutover gate 與 removed legacy ownership
   計算，不以 commit、route、port 或 contract 數量計算。
9. 每批記錄 source files、target owner、consumer reduction、production LOC
   delta、test layer 與 rollback seam。
10. 未達 functional verification 的 checkpoint 不得標成完整 `Verified`。

## 剩餘十個完成階段

| # | 階段 | Done when |
|---:|---|---|
| 1 | Local environment | `.env.example`、ignored `.env.local`；真實 login 與 Supabase read 可重現 |
| 2 | Authenticated behavior baseline | 核心後台頁逐項互動，保存 URL／data source／before evidence |
| 3 | Domain consolidation | 合併 single-consumer pass-through files，禁止新增四件套，更新 CodeGraph map |
| 4 | Test-layer correction | render／visual／interaction／API／provider／real-data journey 分層 |
| 5 | Runtime persistence | DB repositories、runtime events、outbox、idempotency、lease/CAS、retry/replay |
| 6 | Visit/Coco cutover | LINE → Run → wait/resume → artifact → delivery；legacy/shadow/new 可回退 |
| 7 | Ray/Vivian cutover | Orders duplicate/outbox；Reporting schedule dedupe/artifact/delivery |
| 8 | Agent model ownership | ProductOffering、RoleTemplate、Instance、Presentation 各有唯一 owner |
| 9 | Frozen UI data cutover | Dashboard、Flow、TV、Universe、Meeting 讀新 projection，UI/UX parity |
| 10 | Production-like acceptance | staging journey、canary、reconciliation、traffic observation、legacy cleanup |

工程量：

- 若只整理成較健康、仍沿用 legacy execution 的 codebase：估 12–20 active hours；
- 若完成原 canonical productization plan：估 40–70 active hours，另加
  staging/canary observation，且依賴真實環境權限。

## Resume gate

下一批程式碼前必須先完成：

1. 建立本地 env inventory；
2. 取得或確認 local/staging Supabase credentials；
3. 真實登入並完成 authenticated baseline；
4. 定義 consolidation allowlist／collapse list；
5. 將 checkpoint wording 改為分層 verification。

在這五項完成前，不再抽下一條 route。
