# KV 產品化重構 TODO

> 狀態：Needs Revision — 暫停新增 route-specific 抽象，先完成環境、基線與架構收斂。  
> 更新日期：2026-07-31  
> 唯一執行計畫（SSOT）：本文件  
> 現況證據：[重構效能與有效性稽核](./refactor-effectiveness-audit-2026-07-31.md)

## 1. 目標與完成定義

我們要在原專案上漸進重構，不重寫 UI，也不另開空白專案。最終結果必須：

- 保留目前所有頁面、URL、文案、版面、互動與資料格式。
- 將業務能力、Agent 定義、事件、workflow、runtime、資料存取與外部服務分清楚。
- 讓 Agent、工具、流程、模型、觸發器與輸出可以組態化擴充，而不是寫死在 route。
- 將現有 legacy 路徑逐領域切換到可測試、可觀測、可回退的新 owner。
- 減少薄包裝、單一 consumer interface、重複 DTO 與逐 route 文件。
- 以真實登入、真實資料與代表性操作證明功能，而不只證明頁面能 render。

完成不是「檔案搬完」，而是以下條件全部成立：

- [ ] 所有受保護核心頁面有 authenticated before/after evidence。
- [ ] 核心業務 journey 有 functional E2E；關鍵 provider 有 contract/integration test。
- [ ] UI visual snapshot 無非預期差異。
- [ ] domain owner、runtime、repository、provider adapter 的責任沒有重疊。
- [ ] legacy compatibility seam 已列清單，能切流、回退，最後能刪除。
- [ ] 真實資料格式保持相容；schema 變更有 migration、rehearsal 與 rollback。
- [ ] CI 執行 lint、typecheck、unit、integration、build、E2E。
- [ ] production-like 環境完成 canary、reconciliation 與 observation。
- [ ] 文件只剩本 TODO、稽核證據與專案入口，不再逐 route 複製契約。

目前估計完成度：**25–30%**。已做出不少安全邊界與測試骨架，但 runtime persistence、真實功能 E2E、domain consolidation、data cutover 與 legacy cleanup 尚未完成。

## 2. 不變條件

### UI／UX freeze

- 不改 DOM 結構、視覺、responsive 行為、路由、文案、操作順序與 loading／empty／error state。
- 前端只允許為 data source cutover 做內部接線；任何可見差異都需先取得明確同意。
- 每個會影響頁面的工作包都要保存 before/after URL、viewport、DOM/screenshot 與互動結果。

### 資料相容

- 現階段沿用 Dennis 的資料格式與既有 Supabase schema。
- 不因為「目標架構比較漂亮」而提前改 table 或 payload。
- 未來確需改 schema 時，先建立 backward-compatible migration 與 dual-read/write 或 adapter，再切換 consumer。

### 登入與公開面

- 不移除登入牆。它由原作者 commit `2536d71` 在 2026-07-18 建立，不是本次重構新增。
- refactor commit `cafa912` 只抽出 auth 邊界，沒有改變 guard 行為。
- 公開目錄、公開 landing、webhook 與 cron 的公開／驗證規則維持現況。
- 本機登入使用 ignored `.env.local`；至少要有 `AUTH_SECRET` 與 `ADMIN_PASSWORD`。
- 真實後台資料另需 Supabase credentials。不得將 secret commit 進 repo。

## 3. 架構收斂原則

### 應保留的邊界

只有符合至少一項才值得成為 port／adapter：

- 多個 consumer 共用。
- 外部 provider 或基礎設施邊界。
- transaction、idempotency、lease、CAS、outbox、retry 或 replay 邊界。
- 有實質 mapping、translation、policy 或 failure semantics。
- 需要獨立替換、測試或觀測。

### 必須合併的形狀

以下預設視為過度抽象：

- application 只有 `return port.method(input)`。
- interface 只有一個 method、單一 consumer，且沒有替換需求。
- adapter 只有 `{ method: existingHelper }` 或純 alias。
- 一個 CRUD route 各自擁有 rules／ports／application／adapter 四件組。
- 每個 route 再複製一份 Markdown contract。

合併方向：

- 同領域的 rules 合併成少量 policy/value object。
- 同一 repository/provider 的 operations 合併成 shared port。
- orchestration 依「業務 use case」分組，不依 HTTP method 分組。
- HTTP route 只做 parse、auth、呼叫 use case、response mapping。
- legacy adapter 只在真的隔離舊資料／provider 時保留；純 alias 直接內聯。

### 規模護欄

每個工作包合併前後都記錄：

- production files／LOC 的淨變化。
- 新增與刪除的 owner、port、adapter 數。
- single-consumer abstraction 數量。
- CodeGraph consumer／dependency 變化。
- 測試層級與真實功能證據。

預設 gate：

- 同一行為不得同時由 route、application 與 legacy helper 三處擁有。
- 新增一個 abstraction 必須說明替換點或第二個 consumer；否則不新增。
- consolidation 工作包原則上應減少檔案數；若增加，需有可量化理由。
- 不再以 commit 數、route 數或 contract 數當作進度。

## 4. 現況架構與目標映射

下表是施工入口，不複製逐 symbol 清單；每個工作包開始前以 CodeGraph 重新產生 live impact map。

| 領域／能力 | 現有主要入口 | 目標 owner | 目前問題 | 下一個 gate |
|---|---|---|---|---|
| Web／UI | `src/app/**`, `src/components/**` | frozen presentation | UI 可 render，但真實登入與操作證據不足 | 建 authenticated journey baseline |
| Auth／routing | `src/proxy.ts`, `src/lib/auth.ts`, `src/app/api/auth/**` | shared auth policy + session adapter | 本機 env 遺失被誤判成路由問題 | `.env.local` + login/session E2E |
| Agent catalog／definition | `src/lib/agent-*`, `src/modules/agents/**` | Offering / RoleTemplate / Instance / Presentation | 產品、角色、instance、展示資料混合 | 定義 canonical model 與 mapping |
| Runtime／workflow | `src/platform/runtime/**`, `src/platform/workflows/**` | execution runtime + workflow engine | kernel 有骨架，持久化與切流未完成 | event store/run state/outbox |
| Visit／Coco／LINE | `src/app/api/line/**`, `src/lib/visit-*`, `src/modules/visit/**`, `src/adapters/visit/**` | Visit domain + workflow/application services | 最完整也最分散；已有多個薄檔 | 先 consolidation，再 shadow/cutover |
| Orders／Ray | `src/app/api/**orders**`, `src/lib/teachify-*`, `src/modules/orders/**` | Orders domain + inbound workflow | duplicate/outbox semantics 未落地 | idempotent inbound + outbox |
| Reporting／Vivian | reporting/cron routes、`src/modules/reporting/**` | Reporting domain + schedule workflow | 排程、報表、傳送耦合 | dedupe + artifact + delivery |
| Meeting | `src/app/meeting/**`, `src/app/api/meeting/**`, `src/lib/meeting-*`, `src/modules/meeting/**` | Meeting domain + realtime/session adapters | command、session、storage、audio 分散 | consolidation + functional journey |
| Knowledge base | `src/app/api/knowledge-base/**`, `src/lib/kb-*`, `src/modules/knowledge-base/**` | KB domain + ingestion/search providers | 逐 CRUD/import action 切得過細 | repository/provider consolidation |
| Goals／Checklist／Subscribers | 對應 routes、`src/modules/{goals,checklist,subscribers}/**` | Operations domain services | route-specific 四件組最明顯 | 合併 shared repository/use cases |
| Projection／dashboard | dashboard APIs、UI data loaders | read-model projections | UI 仍未由 canonical runtime projection 驅動 | parity cutover |
| External providers | LINE/OpenAI/Google/Teachify/Supabase helpers | provider adapters | failure、retry、rate-limit 契約不一致 | provider contract tests |

### Agent、事件與 workflow 的分界

- Agent 類型是可配置的能力／角色／執行 profile，不等於事件。
- 事件描述「發生了什麼」，例如訂單建立、LINE 訊息收到、meeting command 提交。
- workflow 決定事件之後的步驟、等待、分支、工具與交付。
- runtime 負責 run、step、state、artifact、handoff、retry、resume 與觀測。
- UI 只讀 projection，不直接承擔 runtime 的真實狀態模型。

## 5. 執行順序

任一階段未達 Done when，不得把後續階段標成完成。每一階段以一個有意義的 domain outcome commit 收尾。

### P0 — 文件與進度收斂（本次）

- [x] 建立本文件作為唯一 canonical TODO。
- [x] 將登入誤判、完成度與過度抽象問題寫入稽核。
- [x] 停止新增逐 route contract 與 micro-checkpoint。
- [x] 移除舊 contract 集合與 checkpoint ledger；由 Git history 保留。
- [x] 外部 project card 收斂為短入口。
- [x] commit 本階段（本文件收斂批次）。

Done when：repo 只有 TODO 與 audit 兩份 refactor 文件；外部索引只保留 README／AGENTS；所有連結有效。

### P1 — 可重現本機環境與 authenticated baseline

- [x] 提供 `.env.example`，明列 auth、Supabase 與 optional provider keys。
- [ ] 建立 ignored `.env.local`，使用團隊持有的實際值。
- [ ] 重啟 dev server，記錄 port、commit、env key presence（不記 secret）。
- [ ] 驗證 `/login` 正確／錯誤密碼與 session cookie。
- [ ] 登入 `/dashboard`，確認真實資料 source，不使用 synthetic cookie 冒充登入證據。
- [ ] 點過 dashboard、主要產品頁、核心互動頁，保存 before evidence。
- [ ] 建一組可重複執行的 authenticated Playwright setup。

Done when：新成員依 README 可登入並看到同一份資料；測試會在缺 env 時明確 fail/skip，而非假綠。

### P2 — Domain consolidation 與肥大回收

- [ ] 用 CodeGraph 對 `modules`、`adapters`、legacy helpers 建 consumer map。
- [ ] 建 allowlist：真正跨 consumer/provider/transaction 的 boundary。
- [ ] 建 collapse list：single-consumer interface、delegate application、alias adapter、route-only rules。
- [ ] 先處理 CRUD-heavy 領域：Goals／Checklist／Subscribers／Contacts／Activity。
- [ ] 再處理 Knowledge Base，將 read/write/import/crawl/reindex 收斂成 domain services + repository/provider ports。
- [ ] 再處理 Meeting 與 Visit；保留有實質 side-effect ordering 的 application services。
- [ ] 刪除被取代的 helper、port、adapter、測試重複與 dead exports。
- [ ] 每個領域跑 CodeGraph impact diff、unit/integration、build 與受影響 UI journey。

Done when：不再有逐 route 四件組；沒有純 alias adapter；domain owner 唯一；production file count/LOC 明顯下降且功能證據不退步。

### P3 — 測試層級修正

- [ ] 將現有證據標成 Structural／Contract／Render smoke／Functional／Production-like。
- [ ] 刪除只驗證「fixture 有欄位」或重複 implementation detail 的低訊號測試。
- [ ] 保留高價值 domain rule、mapping、failure semantics 測試。
- [ ] 為 auth、Visit、Orders、Reporting、Meeting、KB 建 API integration tests。
- [ ] 為 dashboard、Visit、Meeting、KB 建 authenticated interaction journeys。
- [ ] 視覺 snapshot 只保留代表性 viewport/surface，避免全頁重複。
- [ ] CI 分 fast gate 與 full gate；任何 skip 都需顯示原因。

Done when：測試失敗能指出業務能力壞掉；render smoke 不再被描述為完整功能驗證。

### P4 — Runtime persistence foundation

- [ ] 定義 Run／Step／Event／Artifact／Handoff／ToolCall 的 canonical schema。
- [ ] 建 repository ports 與 Supabase adapters；沿用現有格式時由 mapper 相容。
- [ ] 建 event append、run state transition 與 optimistic concurrency。
- [ ] 建 idempotency key、lease/CAS 與 duplicate suppression。
- [ ] 建 outbox、retry policy、dead-letter/replay 與 delivery receipt。
- [ ] 建 trace/correlation ID、structured log 與最低觀測指標。
- [ ] migration 先在 local Supabase rehearsal；產生 rollback 與 reconciliation query。

Done when：process restart 後可 resume；重送不重複副作用；event、state、artifact 與 delivery 可追溯。

### P5 — Visit／Coco cutover

- [ ] 將 LINE inbound 正規化成 domain event。
- [ ] workflow 驅動 text/image/postback/invite/offer/approval。
- [ ] 將 research、AI、persistence、delivery 變成共享 capability/provider boundary。
- [ ] timeout 與 webhook 共用同一 workflow/run state。
- [ ] legacy/new 路徑支援 shadow、compare、feature flag 與 rollback。
- [ ] 跑真實或 production-like LINE journey 與 duplicate/retry/failure cases。
- [ ] 穩定後刪除 legacy ownership，不只留下 wrapper。

Done when：Coco 核心 journey 全由新 runtime 擁有，輸出與現況相容，可觀測且可回退。

### P6 — Orders／Ray 與 Reporting／Vivian cutover

- [ ] Teachify/order inbound 正規化與驗證。
- [ ] duplicate suppression、transaction 與 outbox。
- [ ] reporting schedule dedupe、artifact generation、delivery receipt。
- [ ] provider failure、retry、partial failure 與 replay 測試。
- [ ] shadow compare 舊新版輸出，再逐步切流。
- [ ] 刪除 legacy owner 與無用 compatibility seam。

Done when：訂單與報表 journey 由共享 runtime 執行，重送安全、結果一致、可追溯。

### P7 — Agent model ownership

- [ ] 定義 ProductOffering、RoleTemplate、AgentInstance、ExecutionProfile、Presentation。
- [ ] 將觸發器、workflow、tools、model policy、knowledge scope、delivery policy 做成 reference/config。
- [ ] 建 validation 與 versioning；禁止 UI metadata 反向成為 runtime truth。
- [ ] 將 Dennis 現有 Agent 資料映射到 canonical model，不直接改畫面。
- [ ] 清除 `agent-data`、catalog、instance、runtime 的重複 owner。

Done when：新增 Agent 主要是配置與組合能力，不需複製 route 或硬編排一整套程式。

### P8 — Frozen UI data cutover

- [ ] 建 canonical read projections。
- [ ] 依 dashboard → flow → TV → universe → meeting 次序切換 data source。
- [ ] 每頁保存 authenticated before/after screenshot、DOM 與互動結果。
- [ ] 比對 loading/empty/error/data states 與 responsive viewport。
- [ ] 禁止為配合 backend 重構調整可見 UI；差異必須修在 mapper/projection。

Done when：UI/UX 零非預期差異，資料來自 canonical projection，不再依賴 legacy aggregation。

### P9 — Production-like acceptance 與 cleanup

- [ ] staging 使用可代表正式環境的 schema、資料與 provider sandbox。
- [ ] 執行 auth、Visit、Orders、Reporting、Meeting、KB 核心 journeys。
- [ ] canary 切流、shadow reconciliation、錯誤率/latency/duplicate 指標觀察。
- [ ] 驗證 rollback、replay 與資料修復程序。
- [ ] 刪除 feature flag、shadow writer、legacy helper、dead schema 與臨時 bridge。
- [ ] 最後跑 `npm run verify:full`、schema rehearsal 與完整 browser checklist。

Done when：連續觀察期無重大差異，legacy execution 被移除，release/rollback runbook 可執行。

### P10 — 完成驗收

- [ ] 對照第 1 節逐項簽核。
- [ ] CodeGraph 證明 route 不直接擁有 DB/provider business orchestration。
- [ ] production source 與抽象數量回到可解釋範圍。
- [ ] TODO 所有項目完成或有明確接受的 follow-up owner/date。
- [ ] 將 audit 更新為 final evidence，標記本 TODO complete。

## 6. 每個工作包的固定格式

開始前：

1. 寫一句 business/domain outcome。
2. 用 CodeGraph 列 entrypoint、consumer、side effect、data table、provider 與 affected UI。
3. 保存 before 行為；有 UI 就必須在登入後點實際功能。
4. 說明保留、合併、刪除哪些 owner 與 rollback seam。

實作中：

1. 先建立或修正高訊號 characterization test。
2. 搬移 ownership，不複製 ownership。
3. 將 adapter 限制在 translation/infrastructure。
4. 保持 payload/schema/UI 相容。

完成前：

1. focused unit/integration。
2. lint、typecheck、build。
3. affected API functional checks。
4. affected authenticated Chrome journey；必要時 visual diff。
5. CodeGraph impact diff 與 dead consumer 檢查。
6. 記錄 production LOC/file delta、test evidence、rollback。
7. 一個 domain outcome 一個 commit，更新本 TODO checkbox。

## 7. 驗證矩陣

| 變更 | 最低驗證 |
|---|---|
| 純文件 | link/encoding check + public browser sanity |
| 純 domain rule | focused unit + typecheck |
| route/application | unit + API integration + build + affected UI interaction |
| repository/schema | integration + schema rehearsal + rollback query |
| provider adapter | contract test + failure/retry case；可用時跑 sandbox |
| UI data source | authenticated before/after + interaction + visual |
| runtime/cutover | full journey + duplicate/retry/restart/replay + canary evidence |

驗證用語只能使用：

- `Structurally verified`
- `Contract tested`
- `Render smoke passed`
- `Functionally verified`
- `Production-like verified`

不得把較低層證據描述成較高層完成。

## 8. 文件政策

- 本文件是唯一 plan、TODO、進度表與 domain-level source map。
- audit 只保存量化證據、判斷與最終成效，不再變成第二份 TODO。
- 外部 `projects/kv/README.md` 只作專案入口，不複製計畫內容。
- 行為契約寫在可執行 tests；symbol/consumer 映射由 CodeGraph 即時產生。
- 不建立 route-level Markdown、每日流水帳、每 commit checkpoint 或另一份 parallel plan。
- 歷史文件已存在 Git commit `410083a` 及更早歷史，需要追溯時由 Git 讀取。

## 9. 下一次開工點

下一階段只做 P1，不再繼續抽 route：

1. 團隊提供／確認 `.env.local` 所需值與可用 Supabase 環境。
2. 重啟 server 並完成真實登入。
3. 保存 authenticated dashboard 與核心功能 before baseline。
4. 把 Playwright synthetic session 與真實登入測試分開命名。
5. P1 commit 後才進 P2 consolidation。
