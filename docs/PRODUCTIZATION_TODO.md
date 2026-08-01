# KV 產品化重構總清單

> 這是唯一的產品化控制文件。舊版 TODO 已由本版取代，不另建歷史文件；需要追溯時看 Git。
>
> 最後校準：2026-08-02｜最新完成：WP-03 Teachify statistics typed boundary（`968e0ed`）｜進行中：WP-03、WP-02、WP-10 Preparation｜CodeGraph 於各批驗證後同步
>
> 狀態：Active｜規模：Master／multi-domain｜Repo：`F:/ownproject/kv`｜Branch：`codex/kv-wp0-toolchain`｜整體：Needs Revision until external/release unknowns resolve；WP-03 已核准並分批執行

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
| Main Supabase | migration baseline 已可在 `kv-staging` clean replay；DB-only 功能基線完成；本機未設 service-role key | 我方擁有 schema；維持既有資料格式，後續補 generated types；只有實際 privileged journey 需要時才把 service-role 視為 blocker |
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

目前後續順序：完成 WP-03 → 補齊 WP-02 → 逐 domain 執行 WP-10～18 Preparation；WP-05～07 經範圍確認後可並行。Credentials／sandbox 到齊才執行各自 Real Acceptance，接著以真實故障證據決定 WP-20，再完成 WP-21 與 WP-22。

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

### WP-02 — 真實整合驗收基礎 `[~]`

目的：讓後續 provider 工作包共用安全、可重複、可診斷的驗收方式；不建立巨大通用 runtime。

- [x] `.env.example` 已依能力分組，標出 required／optional／read-only／write-capable，並加入本地 `OPENAI_ACCEPTANCE=0` opt-in gate。
- [x] `getIntegrationPreflight()` 已提供不呼叫 provider 的純設定檢查，只回報缺少的變數名稱與「尚未驗證連線」；它與既有 live `getIntegrationStatus()`／UI `connected` semantics 分離，且不輸出 secret。
- [ ] 定義 staging／sandbox／fixture 規則與 cleanup 規則。
- [ ] 為 webhook／cron 定義安全觸發方式、簽章 fixture、重複事件與回復方式。
- [~] 已有獨立 `acceptance:openai`、acceptance Vitest config 與 opt-in gate；其餘 provider 仍需各自 command／test tag，且不得塞進每次 unit verify。
- [ ] 統一驗收證據欄位：環境、journey、輸入、輸出、side effect、cleanup、時間、限制。
- [x] 已決定每個 provider 保有自己的 adapter／錯誤語意；WP-02 只提供驗收格式與 gate，不發明跨 provider framework。

出口：後續各 integration 可用同一驗收格式，但沒有新的無需求抽象。

完成證據（2026-08-02）：`7e13e96` 的 preflight unit tests 證明空白／完整 env matrix 不呼叫 Google OAuth／Calendar，且輸出不包含 fixture secret；既有 integrations status route contract 保持不變。

### WP-03 — Main Supabase 型別契約 `[~]`

目的：以已擁有的 migration 產生 Database types，消除 `src/lib/supabase.ts` 的 `createClient<any>` 擴散風險。

- [x] 已決定以 repo canonical migration 重建 local DB 後產生型別；本地 drift command 先落地，PR CI 接入留給 WP-21。
- [x] 從 `20260801000000_live_baseline.sql` 重建 local Main DB，產生 `src/lib/database.types.ts`。
- [~] `createClient<Database>` 與 `getMainSupabase` 已建立；舊 consumer 暫由同 singleton 的 `getSupabase` 相容入口維持，Teaching client 保持獨立。
- [~] 逐 domain 修復不相容 query／mapping；Visit／Visit history、Goals、Checklist、Orders、Agent administration、Conversation lock、Operations／TV、Subscribers、AI usage、Live task、Meeting store／context、Daily reporting、Support、Teachify stats 已完成；剩餘 Agent runtime 與 Knowledge Base 待分批處理，不改資料格式。
- [x] 加入 `schema:types`／`schema:types:check`；生成結果必須能由 migration 重現且 Git diff 為零。
- [~] 每個完成的 domain 均需通過 focused contract tests 與 typecheck；完整 verify、Main DB contract tests 與受影響頁面 Chrome smoke 於 WP-03 domain cutover 集中執行，未遷移 domain 仍待處理。

WP-03 分段契約與證據（2026-08-02）：

- 範圍只有 generated type、更新／drift 指令與 typed-client migration seam；不改 query、資料、API、UI 或外部 side effect。
- `getMainSupabase` 與既有 `getSupabase` 必須共用一個 client、保留 service-role 優先／anon fallback／缺設定失敗契約；由 `tests/unit/supabase-client.test.ts` 固定。
- Main migration 與程式使用表名已比對；差集中的 `projects`、`project_sessions`、`enterprise_inquiries`、`quotations` 均由 Teaching adapter 使用，不併入 Main type。
- 相容入口刪除條件：既有 Main imports 依 domain 完成 typed migration，`getSupabase`／`LegacyDatabase` production reference 歸零；Teachify stats 批次後尚餘 6 個 runtime reference files，type-only reference 已歸零。
- 每段獨立修正型別、測試與受影響頁面，不一次打開整包 blast radius。
- `schema:types:check` 通過；最新 `npm run verify` 全通過：102 test files／514 tests、lint、typecheck、93-page production build。
- Chrome 變更前後皆驗證登入後 `/agents/visit`；頁面完成載入、`行前功課` empty state 與 disabled 狀態不變，變更後實際點擊 `重新整理` 通過既有 Main client runtime path。
- 第一段 `2264b04`：generated types、reproduction／drift commands、typed client 與共用 singleton 相容入口。
- 第二段 `5c5ae74`：7 個 Visit／Visit-history adapters 已改用 `getMainSupabase`，舊入口在本 domain 歸零；nullable foreign keys、dynamic contact patch、research JSON projection 與 failed invite insert 都有明確 mapping／failure contract。
- 第二段 focused evidence：9 test files／17 tests；完整 `npm run verify` 為 102 test files／514 tests、lint、typecheck、93-page production build全過。
- 第二段 Chrome：變更前後皆驗證登入後 `/agents/visit`；變更後實際刷新行前功課、展開 Agent 設定，完成載入、empty／disabled state 與設定畫面不變。
- 第三段 `4216425`：Goals repository 改由 generated `agent_goals` Row／Insert 與 `getMainSupabase` 約束，保留 list／seed／upsert／delete／reset／history 契約。
- 第四段 `a4aac28`：Checklist repository 改用 `getMainSupabase`，保留 list projection 與 upsert／select／single 寫入契約。
- 第三、四段 focused evidence：5 test files／22 tests與兩次 typecheck；集中完整 verify 為 102 test files／514 tests、lint、typecheck、93-page production build 全過。
- 第三、四段 Chrome：`/goals` 16 筆載入後切換「進度超前 8」並還原；`/todos` 從 0／16 勾選為 1／16（6%）後取消回 0／16（0%），確認真實 Main DB 寫入且測試資料已還原。
- 第五段 `159a819`：Orders repository type 與 Teachify webhook／test-notify composition 改用 `getMainSupabase`；`teachify_orders` conflict key、`line_agents` selector、`line_agent_activity` payload、HTTP response 與 LINE delivery contract 不變。
- 第五段 focused evidence：`orders-routes`、`orders-adapters` 共 2 test files／4 tests 與 typecheck 全過。由於這一批沒有刻意觸發 LINE side effect，Orders Chrome journey 與整包 verify 留待 WP-03 集中驗證。
- 第六段 `d7f137c`：Agent admin／test-push adapters 改用 `getMainSupabase`；將 provider-neutral update 明確投影成 `line_agents` 的 `enabled`、JSON `settings`、`updated_at`，保留 Agent status、activity、LINE channel／payload 與 route error contract。
- 第六段 focused evidence：`agent-admin`、`agent-admin-adapter`、`agent-test-push-adapter`、`agent-admin-routes` 共 4 test files／10 tests 與 typecheck 全過；LINE 發送維持 mock，真實 delivery／Chrome journey 留待 WP-03 集中驗證。
- 第七段 `1bc8b0c`：Conversation lock adapter 改用 `getMainSupabase`，並將兩個已有 production consumer 的 JSON column guard 收斂為 `database-json`；default／custom TTL、same-owner renewal、other-owner rejection、release 與 lazy client 契約不變。
- 第七段 focused evidence：`database-json`、`agent-admin`、`agent-admin-adapter`、`supabase-conversation-lock` 共 4 test files／15 tests 與 typecheck 全過；非 JSON settings／context 現在在 DB call 前明確拒絕，正常 JSON input 的資料與 side effect 不變。Visit／LINE real journey 留待 WP-03 集中驗證。
- 第八段 `7406b2f`：Operations repository 與 TV idle data source 改用 `getMainSupabase`；Contacts nested projection、Activity filter／order／limit、shared tag read／write、TV activity query 與 API response contract 不變。
- 第八段 focused evidence：`supabase-operations-repository`、`tv-idle-data-sources`、`tv-idle`、`tv-idle-route` 共 4 test files／14 tests 與 typecheck 全過。Google calendar／真實 DB 未於此批觸發；TV／Operations Chrome journey 留待 WP-03 集中驗證。
- 第九段 `00ab5a9`：Subscribers repository 與 LINE broadcast adapter 改用 `getMainSupabase`；subscriber list／update／touch、broadcast log、recipient tag／channel filters、message construction 與 log write contract 不變。DB `line_subscribers.channel` 的 check constraint 在 adapter 內明確投影為 domain 的 primary／support channel。
- 第九段 focused evidence：`supabase-subscribers-repository`、`line-subscribers-broadcast-adapter`、`subscribers-service`、`subscribers-broadcast` 共 4 test files／14 tests 與 typecheck 全過。LINE profile／push 全為 mock，未讀寫真實 subscriber／broadcast log，也未送訊息；Subscribers Chrome journey 留待 WP-03 集中驗證。
- 第十段 `1b2f983`：AI usage repository 與 shared budget／usage persistence 改用 `getMainSupabase`；usage query、daily／monthly budget cache、budget rejection、completion／realtime usage log shape 與 best-effort logging semantics 不變。
- 第十段 focused evidence：`supabase-ai-usage-repository`、`ai-usage`、`openai-client`、`meeting-realtime` 共 4 test files／29 tests 與 typecheck 全過。所有 OpenAI／Realtime 呼叫均為 mock，未載入 key、未寫入真實 `ai_usage_logs`；real cost／cleanup 維持 WP-10 gate。
- 第十一段 `980f428`：Live task store 改用 `getMainSupabase`；partial state merge、image version、120-second freshness、status normalization、image read 與 best-effort write／read fallback 不變。
- 第十一段 focused evidence：新增 direct `live-task-store` characterization 並連同 `live-task-state-adapter` 共 2 test files／6 tests 與 typecheck 全過；mock DB 驗證 image update、fresh／stale state 和 missing image。未碰真實 `agent_live_task`；受影響 TV／agent journey 留待 WP-03 集中驗證。
- 第十二段 `736eef9`：Meeting store 改用 `getMainSupabase`；meeting create／turn count and append、history、summary／finish、recording upload／signed URL 的資料與 Storage contract 不變。
- 第十二段 focused evidence：`meeting-store`、`meeting-session`、`meeting-session-routes`、`meeting-conversation` 共 4 test files／23 tests 與 typecheck 全過；mock 覆蓋 turn／history／summary／recording failure semantics。未讀寫真實 meeting／Storage；Meeting Chrome journey 留待 WP-03 集中驗證。
- 第十三段 `4e7ad37`：Meeting context 改用 `getMainSupabase`；Visit／Team Lead live context 的 query、外部 provider fallback 與 prompt composition 不變。typed schema 揭露 `visit_offers`／`pending_invites.contact_id` 可為 null，因此只略過無法對應到現有 contact 的 orphan row；它原本不可能命中以 contact ID 建立的 summary map。
- 第十三段 focused evidence：`meeting-context` 加上前一段 Meeting suite 共 5 test files／25 tests 與 typecheck 全過。未呼叫 Google、GA4、GSC、Teachify 或 knowledge provider；Meeting／Agent live Chrome journey 留待 WP-03 集中驗證。
- 第十四段 `85afccd`：Daily Support／Team Lead report composition 與兩個 report repository DI type 改用 `getMainSupabase`；summary provider、LINE delivery、clock、display-name fallback、read／activity write 與 route／cron response contract 不變。
- 第十四段 focused evidence：`daily-report-runners`、`daily-report-adapters` 共 2 test files／6 tests 與 typecheck 全過。OpenAI summary／LINE delivery 均為 mock，沒有觸發 cron、真實 recipient、usage 或 activity write；Real Acceptance 維持各 provider gate。
- 第十五段 `ec808ee`：Support webhook composition、relay dependency type 與 customer conversation persistence 改用 `getMainSupabase`；signature gate、raw relay payload／header、8-second timeout、support activity、subscriber touch、conversation insert 與 route response contract 不變。
- 第十五段 focused evidence：`support-conversations`、`support-log-reply`、`support-relay-legacy-adapters`、`support-relay-application`、`support-relay-inbound` 共 5 test files／23 tests 與 typecheck 全過。沒有執行 webhook、fetch relay、LINE 或真實 DB write；Support Real Acceptance 仍受 safe fixture／relay target／channel credentials gate。
- 第十六段 `968e0ed`：Teachify order statistics 改用 `getMainSupabase`，並移除舊 client 遮蔽的 row cast；paid／refund split、item revenue aggregation、top-five sort 與 paid-at cutoff contract 不變。
- 第十六段 focused evidence：新增 `teachify-order-stats` characterization，連同 `meeting-context` 共 2 test files／3 tests 與 typecheck 全過。mock DB 固定 7-day cutoff 與 paid／refund aggregation；未讀取真實 Teachify orders，report journey 留待 WP-03 集中驗證。

出口：Main query 具編譯期 schema 契約；無跨 DB type 混用。

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

### WP-05 — 前端內部可維護性 `[?]`

目的：畫面與操作完全不變，只整理 component、資料取得、view model 與重複互動邏輯，讓後端 owner 改動不再靠人工猜哪些頁面會壞。

- [ ] 執行前用 CodeGraph 建立 page → component／hook → API／data source 映射。
- [ ] 找出大型 component、重複資料轉換、重複 loading／error handling、跨頁共享但各自維護的 view model。
- [ ] 只有兩個以上真實 consumer 或明確一致語意時才抽 shared hook／component／view model。
- [ ] 將純 presentation 與 server／provider contract 隔開；不把 domain rule 搬進 React。
- [ ] 保持 route、DOM 關鍵結構、CSS、文案、responsive、loading／empty／error 與互動順序不變。
- [ ] 為管理後台、Visit、KB、Meeting、Agent chat 等關鍵 surface 補最小 affected-page browser contract。
- [ ] 每次只整理一個 UI domain；不得一次改全站 component hierarchy。

出口：前端改動可局部驗證，沒有建立另一套 design system 或重新設計 UI。

### WP-06 — 剩餘 source ownership 與 npm 套件收斂 `[?]`

目的：系統性處理 `src/lib`、`legacy-*`、自幹輪子與過細 layers，但只執行有證據的合併／替換。

- [ ] 以 domain 為單位把剩餘來源標成：穩定共用工具、domain workflow、provider translation、demo／fixture、dead／duplicate。
- [ ] 建立 `src/lib/**` consumer／impact 清單；業務 owner 移至 module，協定翻譯移至 adapter，真正共用工具保留。
- [ ] 逐項審查 `legacy-*`：有實質 mapping／compatibility 就保留並說明；純 forwarding 才合併／刪除。
- [ ] 找出自製 HTTP client、validation、schema、retry、date／cron、file parsing、provider protocol 與 error mapping。
- [ ] 先確認真實契約與維護成本，再比較官方／成熟 npm 套件；有明確收益才替換。
- [ ] 優先沿用已採用的 OpenAI SDK、Zod、Supabase、`googleapis`、`unpdf` 等能力，避免平行實作。
- [ ] 合併只有一個 owner／consumer、沒有替換或測試價值的 rules／ports／application／adapter layers。
- [ ] 每批只動一個 domain，保留 characterization 與 Chrome／provider gates。

出口：程式碼量下降或責任密度提升；不能只把同樣邏輯搬到更多檔案。

### WP-07 — 測試架構與品質訊號 `[?]`

目的：讓測試直接保護產品行為，減少 forwarding test、重複 mock 與「數量增加但信號不增加」。

- [ ] 將現有 tests 依 domain 與 unit／contract／DB integration／provider acceptance／browser journey 分類。
- [ ] 把關鍵 business branches、error／partial failure、資料 mapping 與外部 contract 對到具體測試 owner。
- [ ] 移除只確認函式被轉呼叫、沒有 transformation／policy 價值的低訊號 tests。
- [ ] 共用安全 fixture／builder，但不建立會遮蔽真實 payload 的萬用 mock framework。
- [ ] 將 real provider tests 與一般 `npm run verify` 分離；明確標示 credential gate。
- [ ] 建立最小關鍵 journey browser suite，並保留人工 Chrome 驗證作為高風險改動 gate。
- [ ] 量測 flaky／duration／failure usefulness；不以武斷 coverage 百分比當品質 KPI。

出口：測試失敗能指出被破壞的產品契約；測試數量不再被當成重構進度。

### WP-10 — OpenAI provider preparation／acceptance `[~]`

Preparation 已可執行；Real Acceptance 阻塞：安全的 `OPENAI_API_KEY` 與可接受的測試成本。

- [x] shared official SDK／adapter ownership／fail-closed harness。
- [x] 已有 opt-in synthetic acceptance harness，覆蓋 Agent chat、Structured JSON、Embedding、TTS／STT、Realtime client secret 與 `ai_usage_logs` persistence；不在一般 verify 自動呼叫 provider。
- [~] Preparation：已鎖定 budget rejection 不得呼叫 SDK 或寫 usage、SDK failure 不得被記成成功 usage、malformed structured JSON 回空物件、knowledge provider failure 必須向上傳遞，以及 embedding operation delegation；尚需 cleanup／測試成本上限與其餘 OpenAI surface 的 focused contract。
- [!] Real Acceptance：執行 `npm run acceptance:openai`，驗證真實文字、JSON、向量維度、媒體、短期 token、usage evidence 與 cleanup。

本段 evidence：`ce7c788`；`openai-client`、`openai-knowledge-provider`、`knowledge-base-store` 共 3 test files／12 tests 與 typecheck 通過。全部為 mock／contract 層，未載入 key、未呼叫 OpenAI、未寫入真實 `ai_usage_logs`。

出口：所有現用 OpenAI 能力有受控真實證據；不只是 mock。

### WP-11 — Knowledge Base crawl／index／search `[ ]`

Preparation 依賴 WP-02 基線，可先執行；Real Acceptance 依賴 WP-10 真實 AI 證據，並阻塞於 Firecrawl／OpenAI keys 與安全測試 URL。

- [ ] Firecrawl URL fetch → import draft 的真實契約。
- [ ] draft／publish／access policy 行為。
- [ ] chunk／embedding／index 與重建流程。
- [ ] search relevance 基本 fixture、空結果、provider failure。
- [ ] recheck cron 的 auth、重試／重入與 run evidence。
- [ ] `/knowledge-base`、import 頁與相關 API Chrome journey。
- [ ] 清除驗收資料與記錄成本。

出口：從來源擷取到可搜尋結果的完整 journey 可重複。

### WP-12 — Visit AI journey `[ ]`

Preparation 依賴 WP-02、既有 WP-04 owner，可先執行；Real Acceptance 依賴 WP-10，並阻塞於 OpenAI key。

- [ ] 名片 parse 的 image／structured output／錯誤處理。
- [ ] 邀請 email draft／revise 的輸入、輸出與 usage。
- [ ] Contact research dedupe／run／profile store。
- [ ] 僅驗證 AI 與 DB side effects，不在此包寄信或發 LINE。
- [ ] `/agents/visit` 受影響功能 Chrome journey。

出口：Visit 的 AI 能力可獨立證明，不與 delivery 成敗混在一起。

### WP-13 — Visit delivery workflow `[ ]`

Preparation 依賴 WP-02，可先執行 signature fixture、狀態轉移、lock／timeout 與 recovery contract；Real Acceptance 阻塞於 LINE primary、Gmail、Calendar credentials／sandbox recipient。

- [ ] LINE webhook signature、text／image／postback routing。
- [ ] pending invite／approval／offer／respond 狀態轉移。
- [ ] Gmail draft／send 邊界與安全收件者。
- [ ] Calendar event create／update 邊界與 cleanup。
- [ ] timeout cron、lock 競爭、expired recovery。
- [ ] delivery 部分成功時的狀態與人工復原方式。
- [ ] `/agents/visit` 與相關 webhook 的 end-to-end staging journey。

出口：一條受控 Visit 從 inbound 到 delivery／recovery 可重複驗證。

### WP-14 — Google read capabilities `[ ]`

Preparation 依賴 WP-02，可先整理 query boundary、empty／error mapping 與 demo fallback 分界；Real Acceptance 阻塞於 Google credentials 與可讀測試資產。

- [ ] Schedule／TV 的 Calendar read。
- [ ] Reporting 的 GA4 read 與期間邊界。
- [ ] SEO overview 的 GSC read。
- [ ] empty／permission denied／quota／token expiry 行為。
- [ ] 對應後台頁面 Chrome 驗證，不用 demo fallback 代替真實證據。

出口：三種 read capability 有各自契約、錯誤與 UI 證據。

### WP-15 — LINE delivery／broadcast journeys `[ ]`

Preparation 依賴 WP-02，可先整理 channel identity、payload／error mapping、partial failure 與 recipient allowlist；Real Acceptance 阻塞於 primary／support LINE credentials 與安全 recipient。

- [ ] Agent test push。
- [ ] Subscriber broadcast：目標集合、部分失敗、結果摘要。
- [ ] Orders／Reporting 使用的 primary delivery。
- [ ] Support 使用的獨立 channel identity。
- [ ] reply token、push、rate-limit／provider error 的差異。
- [ ] 驗證 recipient allowlist，避免測試訊息誤發。

出口：LINE channel identity 與各 journey 明確，不共用錯誤 token。

### WP-16 — Teachify Orders `[ ]`

Preparation 依賴 WP-02，可用 synthetic secret／去識別 fixture 驗證簽章、mapping、duplicate／out-of-order 與 persistence；Real Acceptance／notification 依賴 sandbox event，必要時依賴 WP-15，並阻塞於真實 secret／安全 recipient。

- [ ] signature validation、payload mapping、invalid event。
- [ ] 訂單 persistence 與既有資料 shape。
- [ ] duplicate／retry／out-of-order event 行為。
- [ ] notification success／failure 不破壞訂單主狀態。
- [ ] `/agents/orders` 與 test-notify Chrome journey。

出口：同一事件重送不造成不可接受的重複 side effect，且可診斷。

### WP-17 — Reporting／Team Lead `[ ]`

Preparation 依賴 WP-02，可先收斂 manual／cron owner、期間、missing data、failure 與重跑契約；Real Acceptance 依賴 WP-10、WP-14，delivery 必要時依賴 WP-15。

- [ ] manual 與 cron 共用同一 application owner。
- [ ] 報表期間、資料來源、OpenAI summary 與 delivery 契約。
- [ ] missing data、provider failure、重跑／補跑行為。
- [ ] report run／usage／delivery evidence。
- [ ] report、teamlead、traffic overview 頁面 Chrome journey。

出口：manual／scheduled report 結果一致且可安全重跑。

### WP-18 — Support workflow `[ ]`

Preparation 依賴 WP-02，可先整理 inbound signature fixture、conversation mapping、relay／callback owner 與 channel isolation；Real Acceptance 必要時依賴 WP-10／WP-15，並阻塞於 support LINE、relay target／safe fixture。

- [ ] support webhook inbound／signature／conversation mapping。
- [ ] log reply、relay、callback 的責任與錯誤語意。
- [ ] daily report data／summary／delivery。
- [ ] primary 與 support channel 完全隔離。
- [ ] `/agents/support` 與受控 webhook journey。

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
- [ ] 稽核現有 `.github/workflows/ci.yml`：locked install、lint、typecheck、tests、build、Playwright smoke 是否在遠端真實通過。
- [ ] 稽核三組 scheduled workflows 的 secrets、目標 URL、UTF-8、timeout、失敗通知與手動觸發。
- [ ] 補足最小 Playwright／browser smoke，只跑關鍵且穩定 journeys。
- [ ] provider acceptance 與一般 PR CI 分離，避免 secret／成本／不穩定外部依賴阻塞每次 PR。
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
3. Local DB／controlled integration：證明真實資料邊界。
4. Staging journey：證明 UI／API／DB／provider／side effect 串起來。
5. Production-like／release：證明部署、觀測、rollback 與操作流程。

低等級證據不能冒充高等級完成。

## 8. 開始下一批前要決定的事

- [x] WP-01 已完成；conversation lock／Visit settings 的相容層與低訊號 tests 已移除。
- [x] WP-04 已完成；Contact Research workflow 已有單一 module owner，舊 lib／forwarding 已移除。
- [~] WP-03 已核准並完成十六段：generated types／typed-client seam、Visit／Visit history、Goals、Checklist、Orders、Agent administration、Conversation lock、Operations／TV、Subscribers、AI usage、Live task、Meeting store／context、Daily reporting、Support、Teachify stats；尚餘 6 個 runtime caller files，後續只剩 Agent runtime 與 Knowledge Base 兩組 domain。
- [~] WP-02 已有 `.env.example` 能力分組／opt-in gate、integration status、純設定 preflight 與 OpenAI acceptance harness；仍需補跨 provider 驗收欄位、fixture／cleanup 與其餘 provider commands。
- [~] WP-10 Preparation 已完成第一組 local failure contracts；Real Acceptance 仍明確等待安全 key、成本上限與 cleanup 設計。
- [x] Provider 工作包採 Preparation／Real Acceptance 兩軌；缺 key 只阻塞 Real Acceptance，不阻塞 source ownership、contract、fixture 與安全 gate 整理。
- [!] 確認 canonical GitHub repo 與部署目標。
- [!] Real Acceptance 前逐一提供安全 credentials／sandbox／fixture／recipient；未提供時保留明確 pending evidence，不用假資料宣稱真實功能完成。
- [?] WP-05～07 的執行順序與第一個 UI／source／test domain 仍需在開始前確認；不得趁 provider key 缺失時擴張成全站重寫。

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

- 最新完成：`WP-03` Teachify statistics typed boundary（`968e0ed`）；`WP-03` 已完成第十六段，WP-03／WP-02／WP-10 Preparation 均仍在逐 domain／能力執行。
- 結構基線：已建立，但尚不能宣稱整包架構完成；Contact Research、Visit lock／settings、Visit DB adapters、Goals、Checklist、Orders、Agent administration、Conversation lock 已有清楚 owner／typed boundary，其餘 `src/lib`、legacy boundary 與過細 layers 仍待需求／風險驅動收斂。
- 資料庫：Main／Teaching 基線可用；Main generated types 與漸進 typed-client seam 已建立，尚餘 6 個 runtime callers，type-only legacy reference 已歸零。
- 外部功能：Preparation 可在缺 key 時繼續；純設定 preflight 已可區分「未設定」與「尚未驗證」，Real Acceptance 多數仍受 credentials／sandbox／安全 recipient 阻塞，不能只靠 unit tests 宣稱正常。
- 交付系統：本地已有 CI／scheduled workflow 定義，但 canonical remote 無法存取，遠端執行、部署 promotion 與 rollback 尚未證明，是完成產品化的硬缺口。
- 總體判定：**可繼續漸進重構，但尚未達 release-ready；完成度不使用主觀百分比，以上述工作包與證據等級判定。**

## 10. 文件政策

- 本文件是唯一 TODO／產品化控制面。
- Git 歷史保存過程；不建立 `TODO-v2`、每日報告、重構日誌或重複 architecture 文件。
- 穩定且需要冷啟動的知識才進 README／runbook；短期調查只留在 commit／task context。
- 完成的工作包只保留結論、證據與 commit，不持續堆疊逐日敘事。
