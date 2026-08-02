# KV 產品化重構總清單

> 這是唯一的產品化控制文件。舊版 TODO 已由本版取代，不另建歷史文件；需要追溯時看 Git。
>
> 最後校準：2026-08-02｜最新審核：CodeGraph 444 files／3,760 nodes／7,742 edges且 up to date；最新 `npm run verify` 為 127 files／615 tests／93-page build｜當前可執行：WP-13 failure/recovery contracts、WP-11 provider-disabled UI contract｜外部阻塞：provider credentials、canonical remote、deploy／rollback truth
>
> 狀態：Active｜規模：Master／multi-domain｜Repo：`F:/ownproject/kv`｜Branch：`codex/kv-wp0-toolchain`｜整體：Needs Revision until external/release unknowns resolve；WP-03 已完成

## 0. 怎麼使用這份清單

狀態：`[x]` 完成、`[ ]` 未完成、`[~]` 進行中、`[!]` 外部阻塞、`[?]` 需先討論。

執行規則：

- 一次只執行一個已核准的工作包；開始下一包前先跟使用者確認。
- 先完成同一工作包內可修改的程式，再集中跑一次完整驗證與修正。
- 每個工作包都要有：來源映射、行為契約、實作、測試、受影響頁面 Chrome 驗證、CodeGraph／搜尋清理、文件證據、獨立 commit。
- UI／UX 完全凍結；除非另有需求，不調整畫面、文案、導覽、互動或 API 回應形狀。
- 真實 provider／資料庫未驗證時只能寫「結構完成」或「本機契約通過」，不能宣稱功能完成。
- 不按 route 固定建立 rules／ports／application／adapter。只有穩定邊界、第二個真實 consumer，或已知可靠性需求才新增抽象。
- 不做全面重寫。保留可運作產品，採 domain-first、touch-and-migrate 漸進整理。
- 新功能走 Feature lane；碰到舊邊界時，只整理該需求真正經過的路徑。

## 1. 完成定義

KV 可被視為完成產品化重構，必須同時符合：

- [ ] 現有主要使用者旅程在真實或受控 staging 環境有可重複的功能證據。
- [ ] UI／UX 與既有外部契約沒有非預期改變。
- [ ] 每個核心業務決策、狀態與 provider translation 都有清楚且單一的 owner。
- [ ] Main DB schema 可重建、可型別檢查；Teaching DB 被明確視為獨立唯讀來源。
- [ ] 外部 provider 的設定、失敗、重試／去重、成本與診斷方式有明確邊界。
- [ ] `npm run verify`、關鍵 journey smoke、CI、部署與 rollback 可重複執行。
- [ ] 日常需求可沿既有模組擴充，不必把規則再塞回 route、component 或大型 `lib`。
- [ ] 過渡 adapter、重複實作、死碼與無價值薄包裝已移除；保留的相容層都有理由。
- [ ] 維運者能由本文件與程式碼快速定位產品面、domain、資料來源、provider 與故障點。

這不是「所有檔案都搬完」或「抽象越多越好」。完成標準是交付安全、owner 清楚、功能可證明、後續需求有自然落點。

不包含：另開空白專案重寫、全面 UI redesign、為未知未來建立通用 Agent runtime、未經 migration 設計改資料格式，或在沒有獨立需求時進行一般性 security scan。既有 auth、secret、RLS、webhook signature 邊界仍不得被弱化。

## 2. 不可破壞的產品契約

- [ ] 外部展示站：`/agents-catalog/**`。
- [ ] 管理後台：`/dashboard`、`/goals`、`/todos`、`/subscribers`、`/outputs`、`/agents/**`、`/knowledge-base/**` 等。
- [ ] 沉浸／即時畫面：`/meeting`、`/tv`、`/tv/console`、`/universe`。
- [ ] 登入與 session 行為：`/login`、middleware、auth API。
- [ ] API 的 status、JSON shape、錯誤語意與既有 side effects。
- [ ] Main Supabase 與 Teaching Supabase 的既有資料格式。
- [ ] LINE、Google、OpenAI、Firecrawl、Teachify 等外部服務契約。
- [ ] webhook／cron 的驗證、冪等、排程與可重放語意。

任何工作包若需要改上述契約，必須另立產品需求與 migration／cutover 計畫，不能偷偷混在重構裡。

## 3. 現況全貌與程式碼映射

本清單的事實來源：使用者確認的產品目標／限制、目前 Git 工作樹與歷史、CodeGraph production caller／impact、`src/app`／`modules`／`adapters`／`lib` source、migration 與 staging rehearsal、`.env.example`／本機 key presence、automated tests／production build、Chrome journey evidence。來源互相衝突時以較新的可重複證據為準，未知就維持未知。

### 3.1 架構責任

目標依賴方向：

```text
page/component -> API route/composition -> modules/<domain> -> port/interface
                                             ^                    |
                                             |                    v
                                      domain rule            adapters/provider
                                                                  |
                                                                  v
                                                     Supabase / external services
```

- `src/app/**`：HTTP／頁面入口、輸入輸出轉換、composition；不擁有核心業務規則。
- `src/modules/<domain>/**`：use case、domain rule、穩定 port；不直接知道 SDK 或環境變數。
- `src/adapters/<domain>/**`：Supabase、OpenAI、LINE、Google 等協定翻譯與資料映射。
- `src/lib/**`：共用技術工具或尚待盤點的 legacy 能力；不能再成為新業務邏輯的預設落點。
- `src/components/**`：畫面呈現與互動；產品化重構期間保持視覺與操作不變。

Agent 是產品能力／執行者；webhook、cron、postback、button action 是觸發事件；研究、回覆、報告、訂單處理等才是 workflow。三者不能混成同一種抽象。

### 3.2 產品能力索引

| 能力 | 主要 UI | 主要入口／模組 | 資料與 provider |
|---|---|---|---|
| Auth／後台 | `/login`、dashboard layout | `api/auth/**`、`modules/auth` | cookie/session、Main DB |
| Operations／Goals／Todos | `/dashboard`、`/goals`、`/todos` | `modules/operations`、`goals`、`checklist` | Main DB、Teaching read model |
| Subscribers | `/subscribers` | `modules/subscribers` | Main DB、LINE broadcast |
| Knowledge Base | `/knowledge-base/**` | `modules/knowledge-base`、KB APIs | Main DB、Firecrawl、OpenAI embedding |
| Meeting | `/meeting` | `modules/meeting`、9 個 meeting APIs | Main DB、OpenAI audio/realtime |
| Visit | `/agents/visit` | `modules/visit`、LINE webhook、timeout cron | Main DB、OpenAI、LINE、Google |
| Orders | `/agents/orders` | `modules/orders`、Teachify webhook | Main DB、Teachify、LINE |
| Reporting／Schedule／SEO | report、teamlead、schedule、expense pages | `modules/reporting`、agent APIs、cron | Main DB、OpenAI、GA4、GSC、Calendar、LINE |
| Support | `/agents/support` | `modules/support`、support webhook／cron | Main DB、support LINE／relay |
| Agent／Chat／Live Task | agent pages、super agents、TV | `modules/agents`、`agent-chat`、`live-task`、`tv` | Main DB、OpenAI、LINE |

### 3.3 資料與環境真相

| 邊界 | 現況 | 決策 |
|---|---|---|
| Main Supabase | 線上 `kv-staging`（`gizswqvyavkfrtndfzsb`）健康且 32 張 public tables 可查；migration baseline、generated types、DB-only 基線與 Orders app-client staging persistence 均已通過；server-side key 只存在 Git ignored `.env.local` | 線上 staging 是整合驗收主環境；local 只做 migration clean replay／type drift；後續 Main DB journey 直接沿用 allowlisted staging gate 與精確 cleanup |
| Teaching Supabase | 獨立專案、四張表、目前唯讀 | 保留獨立 adapter，不合併成 Main DB，不假裝擁有 migration |
| OpenAI | shared official SDK ownership 已完成；本機缺 key | 先 fail-closed；有安全 key 後跑受控真實驗收 |
| LINE primary／support | `.env.local` 缺 token／secret | 按 workflow 分開驗收，不混用身份 |
| Google | Calendar／Gmail／GA4／GSC credentials 未齊 | 按 read／write 能力分包驗收 |
| Firecrawl | key 未提供 | KB crawl 工作包阻塞 |
| Teachify | secret／安全 fixture 未提供 | webhook 契約可先測，真實驗收阻塞 |
| Cron／support callbacks | `CRON_SECRET`、`SUPPORT_LOG_SECRET`、relay target 未提供 | 先測 fail-closed 與簽章／auth contract；真實觸發需安全 secret／target |
| GitHub／CI | 本地已有 CI 與三組 scheduled workflows；`origin` 目前回覆 repository not found，無法確認遠端 runs／protection | 先恢復 canonical repo 存取，再稽核而不是重做 CI |
| 部署 | scheduled workflows 指向 `https://kva.zeabur.app`；app deploy、staging／production promotion、rollback 尚未確認 | 將 Zeabur 視為線索而不是完整 deployment truth |

Secrets 只放本機 `.env.local` 或正式 secret store，不寫入 Git／TODO／測試 fixture。

## 4. 已完成基線（只保留可驗證結果）

- [x] 建立 domain-first 產品化方向，停止一條 route 一套 layers 的擴張方式。
- [x] Operations、Knowledge Base、Meeting、Orders、Reporting、Support、Agent／TV／Live Task、Visit 主要路徑已有 module／adapter ownership 基礎。
- [x] 清除一批未接 production composition 的 scaffold、dead ports 與重複薄包裝。
- [x] Main Supabase migration baseline 與我方 `kv-staging` clean replay。
- [x] Main DB-only 功能驗收基線。
- [x] Teaching Supabase typed read-only adapter 與 live read acceptance。
- [x] OpenAI official SDK shared transport 與主要 OpenAI adapters ownership 收斂。
- [x] OpenAI fail-closed acceptance harness；缺 key 時明確失敗，不偽裝成功。
- [x] Visit conversation lock／settings ownership 已收斂為直接 Supabase adapters；100 test files／503 tests／93-page build與真實 Visit 後台 Chrome 驗證通過。
- [x] Goals model／client cache 移至各自 domain owner；Visit respond read／fulfilment 保持獨立 port、共用一個 lazy Main DB composition root；兩個 integration-status consumer 共用窄 fetch 實作。這是 ownership 收斂，不是跨元件 request dedupe：兩個 consumer 同時掛載時仍各自發 request。
- [x] Visit dashboard 消除 server／browser local-clock hydration mismatch；重建後 Chrome 實測 `/agents/visit`、`/goals`、`/tv` 與 public invalid respond route，未見 app-origin console error。
- [x] Unit 與 opt-in 線上 staging DB integration 已分離；`server-only` 有單一 test shim，615 個 unit/contract tests 不會預設碰 DB/provider。
- [x] `npm run verify`：lint、typecheck、127 test files／615 tests、93-page production build 全過。
- [x] `npm run verify:full` 另通過 132 個本地 Playwright smoke：真實登入、anonymous API 拒絕、公開與受保護 surface render；E2E 明確使用空 provider／Supabase env，故不構成真實資料流或 provider acceptance。

代表性歷史 commits：`410083a`、`996a4e0`、`b39bd33`、`99856c3`、`c163f1b`、`005c478`、`f866340`、`cc0780c`、`4bbec8e`、`9a96303`、`d11c38e`、`18c9097`、`6d0199f`。完整歷史以 Git 為準，不在本文件複製流水帳。

## 5. 執行路線與依賴

```text
WP-01 Visit 邊界收尾 ──> WP-04 Contact Research owner

WP-03 Main DB types ─┐
WP-05 Frontend 內部品質 ├─> WP-22 最終清理／交接
WP-06 Source／套件收斂 ┤
WP-07 測試架構 ───────┘

WP-02 整合驗收基礎 ─┬─> WP-10 OpenAI ─┬─> WP-11 KB
                     │                 └─> WP-12 Visit AI
                     ├─> WP-13 Visit delivery
                     ├─> WP-14 Google reads
                     ├─> WP-15 LINE journeys
                     ├─> WP-16 Orders
                     ├─> WP-17 Reporting
                     └─> WP-18 Support

Main migration ──> WP-03 Main DB types

provider 實證 ──> WP-20 條件式可靠性整理 ──> WP-22 最終清理／交接
canonical GitHub repo ──> WP-21 CI／release ────────────────┘

WP-F Feature lane 全程並行；需求碰到哪個 owner，就在那個 owner 內 touch-and-migrate。
```

建議順序不是「先把全部 architecture 做完」；是先收掉已開始的安全改動，再建立共同驗收基礎，接著按照拿得到的 credentials／真實需求逐條完成 provider journey。

Provider 工作包固定拆成兩軌：

- **Preparation**：不需要真實憑證即可完成 source／caller mapping、ownership、payload／schema／error contract、synthetic fixture、dry-run／allowlist／cleanup gate 與自動化測試；不得送出真實外部 side effect。
- **Real Acceptance**：需要安全 credentials、sandbox／測試資產與明確 side-effect cleanup；只有這一軌可因外部條件標成 `[!]`，Preparation 不得跟著整包阻塞。
- 真實驗收依風險分批執行：read-only → 有成本但無外部收件者的 AI → inbound webhook fixture → allowlisted write／delivery → composite journey；不做一次同時觸發全部 provider 的巨型驗收。

目前後續順序：先以真實需求補每個 domain 的 Preparation 缺口，不再做機械式拆檔；credentials／sandbox 到齊才執行各自 Real Acceptance，接著以真實故障證據決定 WP-20，再完成 WP-21 與 WP-22。

## 6. 工作包清單

### WP-01 — Visit conversation lock／settings 邊界收尾 `[x]`

目的：完成已核准、已實作但尚未提交的 ownership cleanup，不擴大到其他 Visit workflow。

- [x] `conversation-lock` 改為 `modules/conversation/lock-ports` → `adapters/conversation/supabase-conversation-lock`。
- [x] `visit-settings` 改為 `modules/visit/settings-ports` → `adapters/visit/supabase-visit-settings`。
- [x] 移除兩組 legacy lib／forwarding adapter 與低訊號 forwarding tests。
- [x] route／respond composition 改接直接 adapter。
- [x] direct contract tests 覆蓋 lock owner／expiry／TTL／release 與 settings default／mapping。
- [x] 集中跑完整 `npm run verify`。
- [x] Chrome 登入真實 `/agents/visit`：頁面與資料完成載入、行前功課 empty state 正常、Agent 設定可展開且既有設定值不變，無 app console error；未觸發 LINE／Email／Calendar side effect。
- [x] `rg` 確認舊 helper／adapter 名稱與 import 歸零；CodeGraph impact 僅剩 LINE webhook、Visit timeout cron與 respond fulfilment 三個 production consumers。
- [x] 最終 `npm run verify`：lint、typecheck、100 test files／503 tests、93-page production build全過。
- [x] 本工作包與本段 evidence 由同一 coherent commit 保存，可整包回退。

出口：行為不變、無舊入口殘留、UI smoke 通過、commit 可獨立回退。

### WP-02 — 真實整合驗收基礎 `[x]`

目的：讓後續 provider 工作包共用安全、可重複、可診斷的驗收方式；不建立巨大通用 runtime。

- [x] `.env.example` 已依能力分組，標出 required／optional／read-only／write-capable，並加入本地 `OPENAI_ACCEPTANCE=0` opt-in gate。
- [x] `getIntegrationPreflight()` 已提供不呼叫 provider 的純設定檢查，只回報缺少的變數名稱與「尚未驗證連線」；它與既有 live `getIntegrationStatus()`／UI `connected` semantics 分離，且不輸出 secret。
- [x] 已定義 staging／sandbox／fixture 與 cleanup 規則（見本工作包的 Preparation contract）；規則是執行 gate，不是假裝已完成真實驗收。
- [x] 已定義 webhook／cron 的安全觸發方式、簽章 fixture、重複事件與回復證據要求；尚未在 shared endpoint 觸發任何 cron／webhook。
- [x] 已有獨立 `acceptance:openai`、acceptance Vitest config 與 opt-in gate；`a392cd0` 會於真正 OpenAI acceptance 結束後清除本次合成 `ai_usage_logs`。其餘 provider 的專屬 command／test tag 只在各自具備安全 target 時由 WP-10～18 建立，不再視為共通基礎的未完成項。
- [x] 已統一驗收證據欄位（見本工作包的 evidence record）；不建立跨 provider runtime。
- [x] 已決定每個 provider 保有自己的 adapter／錯誤語意；WP-02 只提供驗收格式與 gate，不發明跨 provider framework。

WP-02 Preparation contract（唯一規格放在此處，不建立 provider framework）：

- 每次 Real Acceptance 都必須先寫明 target（local／staging／sandbox）、可識別的 `codex-<provider>-acceptance` fixture／event ID、無個資輸入、允許的 side effect、成本／收件者限制與可驗證 cleanup。條件不齊時只能跑 Preparation。
- Webhook／cron 先以 local fixture 驗證簽章與授權；shared endpoint 的真實觸發必須使用合成 payload、可重播 event ID、allowlisted recipient 或 delivery-disabled target，並證明 duplicate replay 不造成額外效果及失敗後的回復狀態。
- 每筆 acceptance evidence 必含：環境與時間、journey／entrypoint、fixture 或 event ID、輸入／預期輸出、實際 side effect、cleanup query／結果、限制（成本／recipient／timeout）、commit 與未覆蓋風險。這些欄位寫入相關工作包的完成證據，不另建重複報告。
- Provider command／gate：Supabase local 只使用 `npm run schema:rehearse`／`npm run schema:types:check` 驗 migration 與 type drift；真實資料邊界使用明確 `ORDERS_STAGING_DB_ACCEPTANCE=1`、project-ref allowlist 與 server-side key 的 `npm run test:integration:orders:staging`；OpenAI 使用明確 `OPENAI_ACCEPTANCE=1` 的 `npm run acceptance:openai`。LINE、Google、Firecrawl、Teachify 各自在擁有 sandbox／allowlist／合成 fixture 前維持 Preparation，不能以 UI 狀態或 unit mock 冒充實證。
- OpenAI cleanup 範圍：只刪除本次開始時間後、operation 為 `codex-oai-acceptance:*` 的 rows，以及 agent slug 為 `codex-acceptance` 且 operation 為「網站聊天回應」的 row；不以一般 operation 名稱或時間窗清除 production usage。

出口：後續各 integration 可用同一驗收格式，但沒有新的無需求抽象。

完成證據（2026-08-02）：`7e13e96` 的 preflight unit tests 證明空白／完整 env matrix 不呼叫 Google OAuth／Calendar，且輸出不包含 fixture secret；`a392cd0` 為 OpenAI acceptance 加入受限 `ai_usage_logs` cleanup，強制 `OPENAI_ACCEPTANCE=0` 時 suite 在 provider／DB call 前拒絕；`1c431fb` 為 Teachify HMAC-SHA256 合成 fixture 固定 valid／missing／mismatched contract。全量 unit 110 files／538 tests 與 typecheck 通過；沒有執行真實 OpenAI 或 Teachify acceptance。

### WP-03 — Main Supabase 型別契約 `[x]`

目的：以已擁有的 migration 產生 Database types，消除 `src/lib/supabase.ts` 的 `createClient<any>` 擴散風險。

- [x] 已決定以 repo canonical migration 重建 local DB 後產生型別；本地 drift command 先落地，PR CI 接入留給 WP-21。
- [x] 從 `20260801000000_live_baseline.sql` 重建 local Main DB，產生 `src/lib/database.types.ts`。
- [x] `createClient<Database>` 與唯一的 `getMainSupabase` 已建立；舊 `getSupabase`／`LegacyDatabase` 相容入口已於所有 Main consumer 完成遷移後移除，Teaching client 保持獨立。
- [x] 逐 domain 修復不相容 query／mapping；Visit／Visit history、Goals、Checklist、Orders、Agent administration、Conversation lock、Operations／TV、Subscribers、AI usage、Live task、Meeting store／context、Daily reporting、Support、Teachify stats、Agent runtime、Knowledge Base 已完成 typed-client source migration，不改資料格式；集中 cutover 已完成。
- [x] 加入 `schema:types`／`schema:types:check`；生成結果必須能由 migration 重現且 Git diff 為零。
- [x] `schema:*` command 改以 package-pinned CLI 的 `npx --no-install` 執行（`543dcd3`），消除 shell PATH 對 generated type 驗證的影響。
- [x] 每個完成的 domain 均通過 focused contract tests 與 typecheck；完整 verify、Main DB contract 與受影響頁面 Chrome smoke 已於 WP-03 domain cutover 集中完成。

完成證據（2026-08-02）：

- canonical migration 在乾淨 local Main DB replay 出 32 個 public tables；`schema:types:check` 可重現 generated types 且 Git diff 為零。
- Main consumers 已逐 domain 遷移到 `getMainSupabase<Database>`；`getSupabase`／`LegacyDatabase` 在 `src`／tests reference 歸零，Teaching 四表仍由獨立 typed read-only client 擁有。
- focused contracts 固定 nullable／JSON mapping、query shape、storage、failure fallback 與既有 API；最終 `npm run verify`、93-page build 及登入後 Main DB read/write smoke 通過。
- Chrome cutover 覆蓋 Goals／Todos 寫入還原，以及 Visit、Orders、Operations、Support、Subscribers、Knowledge Base、Meeting、AI Usage、TV、Team Lead read surfaces；未呼叫 OpenAI、LINE、Firecrawl 或 webhook。
- 代表性 commits：`2264b04`、`5c5ae74`、`4216425`、`a4aac28`、`159a819`、`d7f137c`、`1bc8b0c`、`7406b2f`、`00ab5a9`、`1b2f983`、`980f428`、`736eef9`、`4e7ad37`、`85afccd`、`ec808ee`、`968e0ed`、`e2b7087`、`41efe43`、`1281017`；細節由 Git 與 tests 保存，不再放逐批日誌。

出口已達成：Main query 具編譯期 schema 契約、無跨 DB type 混用，且 migration replay／全量驗證／登入後讀取 smoke 均有可追溯證據。

### WP-04 — Contact Research workflow ownership `[x]`

目的：修正目前 `src/lib/contact-research.ts` 同時擁有 30-day dedupe、OpenAI search、run tracking、DB 儲存、activity 與 failure compensation 的混合責任。

- [x] 執行前以 CodeGraph／source 追出 research GET／POST 與 Visit respond 的兩條 production flow、共同依賴與 side effects。
- [x] 以既有 parser、30-day dedupe、success／empty／failure sequencing 建立 characterization／failure contract。
- [x] 將 workflow sequencing 移到 `modules/visit/research`，由單一 use case 擁有。
- [x] 只為既有 DB repository、research provider、run tracking 建立必要 ports；未建立一條 route 一套 layers。
- [x] Supabase／OpenAI translation 留在各自 adapter；兩個 production consumer 共用一個 composition，route 只負責 HTTP 與觸發時機。
- [x] 刪除 `src/lib/contact-research.ts`、`legacy-research-source` 與 respond fulfilment 中已失去用途的 research forwarding。
- [x] 保持 request／result shape、30-day dedupe、run 狀態、活動紀錄與失敗補償；舊 parser test 曾抓到多出的 `inviteId`，已修回相容契約。
- [x] mock／adapter contracts + 完整 verify；真實 OpenAI acceptance 因缺 key，仍由 WP-10／WP-12 管理，不冒充完成。

完成證據（2026-08-02）：

- `npm run verify` 全通過：101 test files／510 tests、lint、typecheck、93-page production build。
- CodeGraph 同步後為 411 files／3,509 nodes／7,383 edges；`runVisitContactResearch` 只由 manual research flow 與 Visit respond background flow 使用。
- `rg` 確認舊 `contact-research`、`legacy-research`、`VisitResearchSource`、`researchContact` 名稱在 `src`／`tests` 已歸零。
- Chrome 前後皆驗證真實登入頁 `/agents/visit`；`行前功課` empty state 與未填姓名時 disabled 狀態不變，並實際點擊 `重新整理` 通過 UI → GET API → module → Supabase adapter，無 app-origin console error。
- 未觸發 manual POST／OpenAI 與 Visit respond 外部 side effects；其真實 acceptance 需安全的 OpenAI key／fixture，證據等級停在 mock contract + local DB read journey。

出口：use case 有單一 owner；不是把一個大函式機械拆成更多小檔。

### WP-05 — 前端內部可維護性 `[~]`

目的：畫面與操作完全不變，只整理 component、資料取得、view model 與重複互動邏輯，讓後端 owner 改動不再靠人工猜哪些頁面會壞。

- [x] CodeGraph 已用於 Goals、Visit 與 integration-status 的 page → component／hook → API／owner 映射。
- [x] Goals catalog／progress model 已移至 `modules/goals/model`，client cache 移至 `components/goals/use-agent-goals`；兩個 status surface 共用窄 fetch hook，保留各自 loading／fallback semantics。該 hook 沒有共用 cache，不能宣稱 request dedupe。
- [~] 已補 Visit／Goals／TV 實機 Chrome regression；KB、Meeting、Agent chat 依實際 source change 補最小 affected-page contract，不把全站人工點測當完成條件。
- [x] 目前沒有足以支持「全面拆 UI」的需求證據；`meeting/page.tsx`、`tv/page.tsx`、KB pages 等大型檔案是 warning signal，不是自動拆檔授權。

後續執行護欄（不是待清空的機械 TODO）：只有兩個以上真實 consumer 或一致語意才抽 shared hook／component／view model；純 presentation 與 server／provider contract 分離；每次只 touch-and-migrate 一個有需求的 UI domain，維持 route、DOM 關鍵結構、CSS、文案、responsive 與 loading／empty／error／互動順序。

出口：前端改動可局部驗證，沒有建立另一套 design system 或重新設計 UI。

### WP-06 — 剩餘 source ownership 與 npm 套件收斂 `[~]`

目的：系統性處理 `src/lib`、`legacy-*`、自幹輪子與過細 layers，但只執行有證據的合併／替換。

- [x] 以 consumer／side effect audit 確認 Goals 的舊 `lib` owner 可移除；Visit respond 的兩個 factory 只共用 client plumbing，已合併為一個 composition root、未合併 read／fulfilment 行為。
- [x] 已盤點 `legacy-*`：Visit LINE／AI adapter、workflow、schema mapping 與 frozen-UI compatibility 仍有實質 translation 或 side effect，保留而不為了檔案數量硬拆／硬刪。
- [x] 2026-08-02 source／套件 audit：OpenAI、Google、Supabase、schema validation 與 PDF parsing 已沿用 `openai`、`googleapis`、`@supabase/supabase-js`、Zod、`unpdf`；簡單 HMAC、固定 UTC+8 換算與 UI timer 使用平台能力即可，沒有引入新套件的收益。
- [~] `src/lib/kb-crawl.ts` 自行維護 Firecrawl HTTP、429 retry 與 crawl polling，是最明確的官方 SDK 比較候選；只有 WP-11 能取得真實 provider parity／error／quota 證據時才決定替換，現在直接換只會增加未知。
- [~] `src/lib/line.ts` 自行維護雙 channel signature／profile／reply／push；在 WP-15 sandbox acceptance 時比較官方 LINE SDK。既有 primary／support identity、payload 與 error semantics 是保留契約。
- [~] `createLegacyVisitLineDeliveryAdapter` 是薄 factory，但 `VisitLineDeliveryPort` 有 webhook 與 timeout 兩個 production consumers。下次 WP-13 改 LINE composition 時可合併 factory／命名，不能刪掉 provider boundary。

執行護欄：每批只動一個有需求或實證風險的 domain；合併只有一個 owner／consumer、沒有替換或失敗隔離價值的 layer，並保留 characterization 與 affected Chrome／provider gate。現階段沒有理由做全域 `src/lib` 搬家。

出口：程式碼量下降或責任密度提升；不能只把同樣邏輯搬到更多檔案。

### WP-07 — 測試架構與品質訊號 `[~]`

目的：讓測試直接保護產品行為，減少 forwarding test、重複 mock 與「數量增加但信號不增加」。

- [x] `tests/unit` 與 opt-in `tests/integration` 已分開；`server-only` 以單一 shim 處理，移除 50 個重複 neutral mock，不建萬用 provider mock framework。
- [x] 已補 KB、Google、LINE、Visit AI、Reporting、Orders、Goals／KB／Visit timeout route 的直接 contract；它們鎖定 mapping、error envelope、auth gate 與 port wiring。
- [x] provider／DB test 不再被一般 `npm run verify` 自動執行；OpenAI／線上 staging DB 都需顯式 gate 與 allowlist。
- [x] 既有最小 Playwright smoke 已在 provider-disabled E2E env 通過 132 tests；人工 Chrome 仍作為高風險 source change 的補充 gate。
- [?] E2E data-less mode 會保留缺 Supabase 的 server log：需在「專用 read-only fixture DB」與「明確、無噪音的 fallback」間做測試環境決策，不能為了安靜而吞掉 production data error。
- [x] 本機 unit／contract suite 連續 5 次通過 127 files／606 tests；Vitest 內部一次 5.36 秒，四次完整 wall time 6.11～6.40 秒。這只建立本機 duration／短期穩定基線，不等同遠端 CI flaky 證據。
- [!] 遠端 flaky、失敗分類與 artifact usefulness 仍需 canonical GitHub repo 恢復後由 WP-21 量測；不以武斷 coverage 百分比或 test 數量當品質 KPI。

出口：測試失敗能指出被破壞的產品契約；測試數量不再被當成重構進度。

### WP-10 — OpenAI provider preparation／acceptance `[~]`

Preparation 已可執行；Real Acceptance 阻塞：安全的 `OPENAI_API_KEY` 與可接受的測試成本。

- [x] shared official SDK／adapter ownership／fail-closed harness。
- [x] 已有 opt-in synthetic acceptance harness，覆蓋 Agent chat、Structured JSON、Embedding、TTS／STT、Realtime client secret 與 `ai_usage_logs` persistence；不在一般 verify 自動呼叫 provider。
- [x] Preparation：已鎖定 budget rejection 不得呼叫 SDK 或寫 usage、SDK failure 不得被記成成功 usage、malformed structured JSON 回空物件、knowledge provider failure 必須向上傳遞、embedding operation delegation，以及只清理本次 acceptance usage rows。Visit、Meeting、Reporting 的 domain prompt／mapping 另有 focused mock contracts。
- [x] acceptance 現在要求獨立的 `OPENAI_ACCEPTANCE_MAX_USD` 明確批准：低於 US$0.05 保守估算、超過 US$0.10 驗收硬上限、缺值或格式錯誤時，全部在 provider／DB 呼叫前拒絕。這是每次驗收的執行 gate，與產品日／月 budget 分離；價格仍須在 Real Acceptance 前依官方模型頁重驗。
- [!] Real Acceptance：執行 `npm run acceptance:openai`，驗證真實文字、JSON、向量維度、媒體、短期 token、usage evidence 與 cleanup。

本段 evidence：`ce7c788` 與後續 acceptance cost-gate commit；cost gate 3 個純契約測試通過，且在缺少 per-run ceiling 時用真實 acceptance command 證明 suite 於 provider／DB 前拒絕。其他 evidence 仍為 mock／contract 層；尚未載入 key、呼叫 OpenAI 或寫入真實 `ai_usage_logs`。

出口：所有現用 OpenAI 能力有受控真實證據；不只是 mock。

### WP-11 — Knowledge Base crawl／index／search `[~]`

Preparation 依賴 WP-02 基線，可先執行；Real Acceptance 依賴 WP-10 真實 AI 證據，並阻塞於 Firecrawl／OpenAI keys 與安全測試 URL。

- [x] mock／contract 已覆蓋 crawl → draft、import、access、publish／discard、search fallback、reindex 與 recheck cron 的 auth／HTTP envelope；未呼叫 Firecrawl／OpenAI／DB。
- [?] `indexDocs` 目前會先刪舊 chunk 再 embedding；embedding failure 時要保留舊 searchable chunks、標記 unavailable，或要求 reindex，屬產品 recovery 決策，不能自行「修正」。
- [!] Firecrawl URL、OpenAI embedding、真實資料 cleanup 與 Chrome journey 仍待安全 fixture／key。
- [x] `/knowledge-base` read surface 已在 Main DB cutover 後登入載入；這只證明 read/render，不證明 crawl／import／publish／search action。
- [x] `/knowledge-base/import` provider-disabled journey 已用登入中的 Chrome 實測：缺 `FIRECRAWL_API_KEY` 時頁面仍正常載入，URL 空白時按鈕 disabled；輸入合成 URL 後 API 回既有「尚未設定 FIRECRAWL_API_KEY，無法從網址匯入」，紅色 error 區塊顯示、按鈕恢復可操作且 app console 無 error。未改 UI／UX，也未發出 Firecrawl、embedding 或 publish side effect。
- [ ] Real Acceptance 清除驗收資料並記錄 Firecrawl／OpenAI 成本。

出口：從來源擷取到可搜尋結果的完整 journey 可重複。

### WP-12 — Visit AI journey `[~]`

Preparation 依賴 WP-02、既有 WP-04 owner，可先執行；Real Acceptance 依賴 WP-10，並阻塞於 OpenAI key。

- [x] parse-card、draft-email、research route 已有 success／invalid input／provider failure／GET contract；Contact Research owner 已由 WP-04 固定。
- [!] 真實 image／structured output、usage、profile persistence 與受控 Chrome journey 仍待 OpenAI／DB fixture。
- [x] `/agents/visit` read／settings／research refresh 已有登入後 Chrome evidence；未點擊 parse-card／draft-email，不能冒充 AI action journey。

Real Acceptance 邊界：只驗證 AI 與 DB side effects，不在此包寄信或發 LINE。

出口：Visit 的 AI 能力可獨立證明，不與 delivery 成敗混在一起。

### WP-13 — Visit delivery workflow `[~]`

Preparation 依賴 WP-02，可先執行 signature fixture、狀態轉移、lock／timeout 與 recovery contract；Real Acceptance 阻塞於 LINE primary、Gmail、Calendar credentials／sandbox recipient。

- [x] LINE transport 的 primary／support channel isolation、webhook signature routing、Visit timeout cron auth／port wiring 與 public respond invalid-link path 已有 local contract／Chrome evidence。
- [x] pending offer cancel／accept、approval cancel／send、public respond optimistic claim／duplicate POST／calendar failure與 timeout stale-window 已有 local application contracts。
- [~] approval send／cancel、offer cancel 與排程／寄信 recovery 已保證：即使 status、runtime、activity 或 LINE failure response 本身失敗，仍會嘗試釋放 Visit conversation lock；成功路徑、文案、資料格式與 provider call 不變。2 files／8 focused tests、全量 127 files／615 tests／93-page build，以及登入後 `/agents/visit` 設定展開／app-origin console 均通過。email 已送但後續狀態或 reply 失敗的精確狀態、slot／draft failure 與人工 recovery 仍待處理。
- [x] mocked `googleapis` 已固定 Gmail UTF-8 MIME/base64url/send envelope，以及 Visit 建立 primary Calendar event、`sendUpdates: all`、Asia/Taipei 時區與 attendee mapping；production 沒有 update-event 能力，因此未虛構 update contract。安全收件者與 cleanup 留給 Real Acceptance。
- [~] lock acquisition 已改為 observed owner＋expiry 的 compare-and-swap；missing-row race 依 Postgres `23505` 重新讀取 winner，Supabase read／write／release error 全部 fail closed。Visit image flow 會檢查 acquisition result，conflict 時在 contact／offer persistence 前停止並收尾 run／回覆。timeout 在 offer 成功寫成 terminal 後，即使 tag／activity／live-task／LINE 後續失敗也會於 `finally` 嘗試釋放 lock；若 terminal write 本身失敗則保留 lock。既有 timeout 會先寫 `timed_out` 再執行其他 side effects，後續失敗不會被 stale query 自動重播，因此完整 retry／replay 仍是產品 recovery 決策。
- [?] delivery 部分成功時的狀態與人工復原方式：目前 Calendar 成功後先寫 `calendar_event_id`，再寄 Gmail；若寄信或之後工作失敗會把 invite 標成 `failed`，重送又會被既有 event ID 擋下。需決定「人工補寄／重新開放 fulfilment／另記 delivery state」後才可改，不能把已建立的 Calendar event 當作未發生。
- [ ] `/agents/visit` 與相關 webhook 的 end-to-end staging journey。

出口：一條受控 Visit 從 inbound 到 delivery／recovery 可重複驗證。

### WP-14 — Google read capabilities `[~]`

Preparation 依賴 WP-02，可先整理 query boundary、empty／error mapping 與 demo fallback 分界；Real Acceptance 阻塞於 Google credentials 與可讀測試資產。

- [x] OAuth、Calendar、GA4、GSC 的 config failure、refresh、query mapping、empty/failure fallback 已由 9 個 local direct contracts 固定。
- [!] 真實讀取、permission／quota／token expiry 與對應後台 evidence 仍待 Google credentials／測試資產。

出口：三種 read capability 有各自契約、錯誤與 UI 證據。

### WP-15 — LINE delivery／broadcast journeys `[~]`

Preparation 依賴 WP-02，可先整理 channel identity、payload／error mapping、partial failure 與 recipient allowlist；Real Acceptance 阻塞於 primary／support LINE credentials 與安全 recipient。

- [x] primary／support transport、reply／push payload、token absence、provider failure 與 webhook channel isolation 已有 local contracts。
- [!] 實際 Agent push、broadcast、Orders／Reporting delivery、rate limit 及 recipient allowlist 仍待安全 credentials／收件者。

出口：LINE channel identity 與各 journey 明確，不共用錯誤 token。

### WP-16 — Teachify Orders `[~]`

Preparation 依賴 WP-02，可用 synthetic secret／去識別 fixture 驗證簽章、mapping、duplicate／out-of-order 與 persistence；Real Acceptance／notification 依賴 sandbox event，必要時依賴 WP-15，並阻塞於真實 secret／安全 recipient。

- [x] signature validation、去識別 HMAC-SHA256 fixture、invalid event 與既有 direct／envelope／enrollment payload mapping 已由 local contracts 固定（`1c431fb`、既有 orders suite）。
- [x] 變更契約已收斂在本工作包：範圍是 Orders repository 對 `teachify_orders`／`line_agent_activity`／`line_agents` 的線上 staging persistence；consumer 是 Teachify webhook 與 Orders test-notify route；不改 UI、payload、資料格式、LINE delivery 或 production RLS。
- [x] 輸入／狀態：只接受去識別 UUID fixture、明確 `ORDERS_STAGING_DB_ACCEPTANCE=1`、`KV_STAGING_PROJECT_REF` allowlist、`SUPABASE_URL` 與 server-side key；輸出／side effect 必須是同一 order 的 insert→upsert update、activity insert、讀回既有 row shape，最後精確 cleanup。一般 verify 不執行此 gate。
- [x] 不變量／例子：同一 `order_id` 第二次寫入仍更新既有 row，`source=webhook`、TWD／refund／paid_at／item_names mapping 不變；fixture 不含真實個資、不送 LINE、不留 staging rows。UI states 不在本變更範圍，故不得拿頁面 render 取代 DB 證據。
- [x] `test:integration:orders:staging` 已取代 loopback-only harness；會驗 repository 的 Supabase client path、精確 project host、row mapping 與 cleanup，缺 gate／allowlist／server-side key 時 fail closed。
- [x] 2026-08-02 直接對線上 `kv-staging` 做受控 transaction rehearsal：order insert→upsert 後讀回 `STAGING-UPDATED`／1780／refund=true，activity row 讀回 success；transaction rollback 後 order／activity／fixture Agent 均為 0 rows。此證據只證明 live schema／SQL data boundary，不冒充 app-client 或 Teachify→LINE journey。
- [x] 2026-08-02 已從 `kv-staging` Dashboard 安全設定 server-side secret 至 Git ignored `.env.local`，並執行 `ORDERS_STAGING_DB_ACCEPTANCE=1 npm run test:integration:orders:staging`：1 file／1 test 通過；Supabase cleanup query 再確認 order／activity／fixture Agent 均為 0 rows。這證明實際 `supabase-js` → Orders repository → online staging path；Teachify 真實 webhook 與 LINE 通知仍各自等待 secret／sandbox event／安全 recipient。
- [x] Orders data failure 已 fail closed：adapter 不再忽略 Supabase `{ error }`，Agent 設定改用 `maybeSingle()` 保留「0 rows＝尚未設定」，真正 upsert／read error 由 webhook 與 test-notify API 回 `503` 且不進行 LINE delivery；activity telemetry 維持 best effort 並記錄完整 provider error。25 個 focused contracts、online staging repository、cleanup 0 rows、登入後 `/agents/orders` 設定展開與 console、全量 127 files／608 tests／93-page build 均通過。
- [?] duplicate／retry／out-of-order event 行為：目前 repository 會以 order ID upsert，但 workflow 每次仍會進行 notification delivery；需先決定「同一 order 重送是否只寫 activity／是否可重送通知／如何辨識狀態更新」後才可安全改動。
- [x] notification success／failure 不破壞訂單主狀態的 mock contract 已存在；真實 delivery 仍受 WP-15 sandbox recipient gate。
- [~] `/agents/orders` read-only Chrome journey 已於 WP-03 cutover 載入；test-notify 的真實 delivery journey 仍待安全 recipient。

出口：同一事件重送不造成不可接受的重複 side effect，且可診斷。

### WP-17 — Reporting／Team Lead `[~]`

Preparation 依賴 WP-02，可先收斂 manual／cron owner、期間、missing data、failure 與重跑契約；Real Acceptance 依賴 WP-10、WP-14，delivery 必要時依賴 WP-15。

- [x] daily report provider failure／no-key fallback 與 cron missing／wrong secret／authorized envelope 已固定為 local contracts。
- [!] 真實資料、OpenAI summary／usage、delivery、replay 與頁面 journey 仍待 provider／recipient gate。

出口：manual／scheduled report 結果一致且可安全重跑。

### WP-18 — Support workflow `[~]`

Preparation 依賴 WP-02，可先整理 inbound signature fixture、conversation mapping、relay／callback owner 與 channel isolation；Real Acceptance 必要時依賴 WP-10／WP-15，並阻塞於 support LINE、relay target／safe fixture。

- [x] support webhook 的 signature gate、relay boundary 與 primary／support channel isolation 已由 local contracts 固定。
- [!] 真實 relay、callback、delivery 與 `/agents/support` 受控 journey 仍待 support credentials／target。

出口：support inbound、人工操作、relay 與日報各有可追蹤結果。

### WP-20 — 條件式可靠性整理 `[?]`

只處理由 WP-10～18 的真實證據暴露出的問題，不預先建平台。

- [ ] 對每條 write／delivery workflow 評估 idempotency key、retry、timeout、partial failure、replay、dead-letter／manual recovery。
- [ ] 有兩個真實 consumer 或共同故障模式時，才抽 shared primitive。
- [ ] 優先利用現有 `agent_runs`、`agent_run_steps`、`ai_usage_logs`、activity 資料，而不是另建平行 runtime。
- [ ] 每個 reliability change 都有故障注入或契約測試。
- [ ] 將仍屬產品特定的規則留在 domain module。

出口：可靠性改動對應已觀察風險；沒有「為了未來也許會用」的框架。

### WP-21 — GitHub、CI、部署與 rollback `[!]`

阻塞：canonical GitHub repo 與部署目標尚未決定。

- [ ] 確認／恢復我方 canonical GitHub repo、權限與 branch policy；目前 `origin` 回覆 repository not found。
- [ ] 修正 remote；保護使用者既有歷史，不 force-push。
- [x] 本地 CI 定義已加 PR-only concurrency、failure 時的 Playwright diagnostics artifact，並正確標示 `npm test` 為 unit boundary；`verify:full` 已於本機通過。
- [!] 遠端仍未能驗證 locked install、lint、typecheck、tests、build、browser smoke 或 artifact；不可把本地 workflow diff 當作 CI 真實證據。
- [x] 本地靜態稽核三組 scheduled workflows：皆使用 `CRON_SECRET`、hard-code `https://kva.zeabur.app`、有 120／300 秒 curl timeout 與 `workflow_dispatch`；YAML／繁中註解為 UTF-8。遠端 secret 是否存在、Zeabur 是否 canonical、run 成敗仍未知。
- [ ] 補 scheduled job 失敗通知／owner；實作前需先決定通知目的地，不能自行對外發訊息。
- [x] 本地 Playwright 已涵蓋登入、anonymous API rejection、公開／受保護 surface；先維持淺而廣的 smoke，不再以增加 page count 當進度。
- [x] OpenAI acceptance／Orders staging DB integration 已與一般 PR verify 分離；其他 provider 也只在具備安全 target 時建立獨立 gate。
- [ ] 明確 staging／production deploy command、migration ordering、health check。
- [ ] 建立 rollback：app version、migration compatibility、secret rollback、failed webhook／cron recovery。
- [ ] 記錄 release owner 與最低可觀測訊號。

出口：合併、部署、驗證、回退是一條可重複流程。

### WP-22 — 最終結構清理與交接 `[ ]`

依賴：已選定的 provider journeys、WP-20、WP-21。

- [ ] 確認 WP-03～07 與已選定 provider／reliability 包的出口都已達成，未執行項目有明確接受理由。
- [ ] 移除最後的 dead code、過渡 re-export／flag、過期 tests、demo fallback 誤用與未接 composition。
- [ ] 更新冷啟動文件／runbook；不新增重複 architecture 文件。
- [ ] 全量 verify、CodeGraph drift、production build、關鍵 UI／API／provider matrix、staging cutover rehearsal。

出口：沒有無主流程與無理由抽象；新工程師可由 domain 與本文件找到正確修改點。

### WP-F — 持續 Feature lane `[~]`

每個新需求都遵守：

- [ ] 先寫可觀察的使用者／營運結果與不變契約。
- [ ] 用 CodeGraph 找真正 production entry、owner、data/provider side effects。
- [ ] 在現有 domain owner 內修改；只有 owner 不清楚時才做最小 consolidation。
- [ ] 先做 characterization／contract，再改實作。
- [ ] 同一批完成程式碼後集中 verify 與 affected-page Chrome 驗證。
- [ ] 一個 coherent commit；若觸發新的結構債或 provider 缺口，回填本清單。

## 7. 每個工作包的固定驗收模板

執行時直接在對應工作包下補證據，不另開報告文件。

- [ ] Scope：明確列出 included／excluded paths 與 journeys。
- [ ] Before：目前 production composition、行為與失敗語意。
- [ ] Contract：UI、API、資料、事件、side effect 哪些不能變。
- [ ] Code：單一 owner、依賴方向、移除項目與保留理由。
- [ ] Static：lint、typecheck、build、`rg`、CodeGraph。
- [ ] Automated：unit／contract／integration 結果與數量。
- [ ] Data/provider：使用的環境、fixture、side effects、cleanup；未執行要寫明阻塞。
- [ ] Browser：改動前後受影響真實頁面／操作；API-only 也要走會觸發該 API 的 UI（若產品沒有 UI 才記錄例外）。
- [ ] Regression：相鄰 journey 與 auth／navigation smoke。
- [ ] Commit：hash、回退方式、殘留風險。

證據等級：

1. Static：只能證明結構／型別／build。
2. Mock／contract：只能證明我方邏輯與預期協定。
3. Controlled DB integration：在 local migration DB 或 allowlisted online staging 證明真實資料邊界，並標明兩者證據差異。
4. Staging journey：證明 UI／API／DB／provider／side effect 串起來。
5. Production-like／release：證明部署、觀測、rollback 與操作流程。

低等級證據不能冒充高等級完成。

## 8. 下一個可執行佇列

以下只列會改變 readiness 的具體工作，不再重複已完成歷史或永久性治理原則。

### 不需外部憑證，可直接安排

1. **WP-10 acceptance cost gate**：為 `acceptance:openai` 加單次最大預估成本／拒絕條件與 contract；不呼叫 OpenAI。
2. **WP-13 remaining recovery**：補 email 已送後的狀態／人工復原決策、slot／draft failure與 timeout retry／replay；不發 Email／LINE、不寫共享環境。
3. **WP-11 provider-disabled UI contract**：只驗 `/knowledge-base/import` 的 validation／loading／error，不把頁面 render 當 Firecrawl／OpenAI acceptance。

### 需產品決策後才能改

- **KB recovery**：embedding 失敗時保留舊 chunks、標記 unavailable 或要求 reindex。
- **Teachify replay**：同一 order 重送是否再次通知，以及狀態更新／人工 recovery 的語意。
- **E2E data mode**：專用 read-only fixture DB，或明確且無噪音的 provider-disabled fallback。
- **Scheduled failure notification**：通知目的地與 owner。

### 外部阻塞

- Provider Real Acceptance：OpenAI、Firecrawl、Google、LINE、Teachify／Support 需要各自安全 credentials、fixture／recipient 與 side-effect cleanup；Orders app-client staging persistence 已完成，local DB 不再是前置條件。
- Release：canonical GitHub remote／權限、Zeabur staging／production truth、promotion 與 rollback owner。

### 明確不先做

- 不全面拆 `meeting`／`tv`／KB 大型 UI；等真實需求碰到再 touch-and-migrate。
- 不為減少檔案數刪除有 provider translation、transaction／recovery 或兩個 production consumers 的 port／adapter。
- 不先換 Firecrawl／LINE client；等各自 Real Acceptance 能做 parity 比較後再決定。

### 目標追蹤

| 產品化目標 | 對應工作包 |
|---|---|
| UI／UX 與外部契約不變 | WP-01、03～07、10～18、固定驗收模板 |
| domain owner 清楚、架構不膨脹 | WP-01、04、06、20、22 |
| 前端可維護且可驗證 | WP-05、07、21 |
| Main／Teaching 資料契約可信 | 已完成基線、WP-03 |
| 外部功能真實可用 | WP-02、10～18 |
| failure／retry／recovery 有依據 | WP-16～20 |
| CI、部署、rollback 可重複 | WP-21、22 |
| 需求可持續並行 | WP-F |

## 9. 目前 readiness 判定

- 最新完成：Goals／Visit ownership、integration-status fetch implementation consolidation、Visit hydration repair、integration test isolation、provider/route contracts 與本地 CI diagnostics（`0a525ed`～`df5e9fb`）；WP-03 migration、local replay、full verify 與 Chrome cutover 已完成。integration-status 尚未做跨元件 request dedupe。
- 結構基線：已建立，但尚不能宣稱整包架構完成；Contact Research、Visit lock／settings／respond、Goals、Checklist、Orders、Agent administration、Conversation lock 已有清楚 owner／typed boundary。其餘 `src/lib`、legacy boundary 與過細 layers 只在需求／風險證明時收斂，避免再製造模組膨脹。
- 資料庫：Main／Teaching 基線可用；Main generated types 與 typed-client migration 已完成，Knowledge Base 是最後遷移 domain，legacy `getSupabase`／`LegacyDatabase` reference 已歸零；canonical migration local replay、generated-type drift check 與後台 read smoke 均已有證據。
- 外部功能：Preparation 可在缺 key 時繼續；目前有 127 files／615 tests、132 local E2E smoke、OpenAI／online staging DB opt-in gates 與 provider-specific contract。`kv-staging` live schema transaction、Orders app-client persistence／data-failure fail-closed、conversation lock contention／expiry path 均已通過且無殘留；E2E 使用 provider-disabled fallback且會留下缺 Supabase server logs，其他 Real Acceptance 多數仍受 credentials／sandbox／安全 recipient 阻塞，不能只靠 smoke 或 unit tests 宣稱正常。
- 程式碼膨脹判定：自 `b762258` 起淨增 `src` 156 行、tests 2,858 行、CI/config 47 行，docs 淨減 27 行；近期 production 增量直接修復 Orders data-failure、Visit lock-stuck 與非原子的 lock contention。production 未增加 layer／port／新檔；測試端新增 1 個 lock staging journey 與 1 個共用 staging allowlist/client helper，並從 Orders harness 移除重複環境檢查。測試量不作為進度，後續仍以 failure signal、change locality、維護成本與真實 journey 判斷保留。
- 交付系統：本地已有 CI／scheduled workflow 定義，但 canonical remote 無法存取，遠端執行、部署 promotion 與 rollback 尚未證明，是完成產品化的硬缺口。
- 總體判定：**可繼續漸進重構，但尚未達 release-ready；完成度不使用主觀百分比，以上述工作包與證據等級判定。**

## 10. 文件政策

- 本文件是唯一 TODO／產品化控制面。
- Git 歷史保存過程；不建立 `TODO-v2`、每日報告、重構日誌或重複 architecture 文件。
- 穩定且需要冷啟動的知識才進 README／runbook；短期調查只留在 commit／task context。
- 完成的工作包只保留結論、證據與 commit，不持續堆疊逐日敘事。
