# KV 產品化控制清單

> 這是唯一的產品化 TODO、現況索引與 readiness 判定。Git 保存歷史，不另建 TODO v2、重構日誌或重複 architecture 文件。

## 1. 目標、邊界與完成條件

目標：在原 repository 內漸進整理 KV，使工程團隊能理解、驗證、修改、部署與擴充；既有 UI／UX、API、資料格式與外部 side effects 除非另有產品需求，全部保持不變。

狀態：`Active`｜Repo：`F:/ownproject/kv`｜Branch：`codex/kv-wp0-toolchain`｜環境：Main `kv-staging` + 獨立唯讀 Teaching DB｜判定：`Architecture ready for scoped KV delivery; needs external acceptance and release truth`

### 換機接續 checkpoint（2026-08-14）

- Git snapshot：`codex/kv-wp0-toolchain`，以本文件所在 branch tip 為準；本次同步前 tip 為 `192cab9`。CodeGraph 為 456 files／3,920 nodes／9,794 edges，無 pending drift。
- Remote：`origin` 仍是已無法解析的 `cablate/kv`；可用的作者 repo 已登記為 `upstream = https://github.com/fanstudents/kv.git`。作者 `main` 截至 `d958a0b`，相對共同基底有 13 個 commits，尚未合併。
- 新電腦先讀：本文件 → `AGENTS.md`／`CLAUDE.md` → `README.md` → `.env.example`；不要重做全 repo 掃描或再建平行 TODO。
- 恢復順序：clone `fanstudents/kv` → switch `codex/kv-wp0-toolchain` → `npm ci` → 以安全管道重建 `.env.local` → `npm run verify`。`.env.local` 被 Git 忽略，必須另用 password manager／secret store 轉移，絕對不要 commit。

### KV 推廣與模組化要求（2026-08-13）

- [Fact] Dennis 預計 9 月底開始推廣 KV；實際推廣版本範圍與必須通過的旅程尚未確認。
- [Requirement] KV 的能力需要整理成模組；目前仍有部分糾纏，應沿既有 domain／adapter boundary 漸進收斂，不一次建立未知需求的通用平台。

完成產品化必須同時成立：

- [ ] 目前仍在使用的核心旅程有可重複的 staging／sandbox 功能證據，不只 mock 或 render smoke。
- [x] Main migration 可 clean replay、generated types 可重現；Teaching DB 保持獨立唯讀來源。
- [~] 核心 domain owner 與 provider boundary 已建立；剩餘 legacy 只在真實需求／故障證據下 touch-and-migrate。
- [~] 外部 provider 的設定、成本、錯誤與 side-effect gate 已準備；真實 key／recipient 驗收尚未完成。
- [x] 本地 lint、typecheck、unit／contract、production build 與 browser smoke 可重複執行。
- [ ] canonical CI、部署、健康檢查與 rollback 可重複執行。
- [ ] product-specific partial failure／retry／replay 決策已確認並驗證。
- [~] 無價值薄包裝持續收斂；保留的 port／adapter 必須有 provider translation、多 consumer、transaction、concurrency 或 recovery 理由。

不做：另開空白專案重寫、全面 UI redesign、為未知未來建立通用 Agent runtime、無 migration 設計改資料格式、以檔案數或測試數當進度。

## 2. 不可破壞契約

- UI／UX：`/agents-catalog/**`、管理後台、`/meeting`、`/tv`、`/universe` 的畫面、文案、導覽、responsive 與互動順序。
- Auth：`/login`、session cookie、proxy／middleware 與 anonymous API rejection。
- API／事件：HTTP status、JSON shape、webhook／cron 驗證、既有事件與 side-effect ordering。
- Data：Main Supabase 既有 schema；Teaching Supabase 獨立唯讀，不假裝擁有其 migration。
- Provider：LINE primary／support 身份、Google、OpenAI、Firecrawl、Teachify 的 payload 與錯誤語意。

任何刻意改動都要另立需求與 migration／cutover；不能混進結構重構。

## 3. 現況架構與 source map

```text
page/component -> API route/composition -> modules/<domain> -> port
                                             |                 |
                                             v                 v
                                         domain rule       adapters
                                                               |
                                                               v
                                                Main/Teaching DB or provider
```

- `src/app/**`：HTTP／頁面入口、輸入輸出與 composition，不擁有核心規則。
- `src/modules/<domain>/**`：use case、狀態轉移與必要 port，不直接依賴 SDK／env。
- `src/adapters/<domain>/**`：資料／provider 翻譯、錯誤與可靠性邊界。
- `src/lib/**`：共用技術能力與待觸碰 legacy；不是新業務邏輯的預設落點。
- `src/components/**`：既有 presentation；只有真實需求才局部整理。

Agent 是產品角色／執行設定；webhook、cron、postback 是事件；研究、邀約、報告、訂單才是 workflow。不要把三者混成通用 runtime。

### 架構判定

- **整體骨架已就位**：entrypoint、domain owner、port／adapter、Main／Teaching DB ownership 已足以讓新需求沿既有邊界開發；不需要再做一輪全 repo 搬檔。
- **不是所有模組都同樣成熟**：OpenAI shared transport、Orders、Support 已有清楚 owner；Visit 已模組化但仍保留少量有界的 legacy translation；Knowledge Base 已把 Firecrawl HTTP／quota／retry 與 Main persistence／ingestion 分責；Teachify 的真實簽章契約仍未由 sandbox event 證實；GA4／GSC／Google 已有 provider boundary。`/integrations` 的管理連結與 Agent 用途仍保留 localStorage demo，但連線 badge／計數已改讀 `/api/integrations/status` live truth。
- **下一階段是需求驅動的垂直切片，不是水平重構**：依 KV 已確認的功能需求與 journey，只整理該 journey 經過的 capability module、provider adapter、recovery 與驗收證據。沒有第二個真實 consumer 或共同故障模式，不抽通用框架。

| Boundary | 現況 | 後續原則 |
|---|---|---|
| OpenAI | shared client + domain adapters，真實 acceptance 已通過 | 保持現有邊界，不再抽象一層；各 composite journey 只補 domain evidence |
| Orders／Teachify | Orders workflow／repository／LINE delivery 已分離；真實 webhook 契約未證實 | sandbox event 驗簽章、重送、out-of-order，再決定 recovery |
| Visit／LINE／Google | use cases、ports、lock 已建立；少量 `legacy-*` compatibility seam 仍在 | 只隨真實 delivery journey touch-and-migrate |
| Knowledge Base／Firecrawl | 真實單頁 journey 已通過；`firecrawl-client.ts` owner HTTP／quota／retry，`kb-crawl.ts` owner Main source state／ingestion orchestration | 保持這兩個故障／回滾邊界，不建 generic crawler platform |
| Reporting／GA4／GSC | provider query boundary 已有；部分 demo／fallback 尚未被真實資料取代 | 先用授權的 read-only property/site 驗輸入、空資料與 quota |
| Integrations UI | 卡片、管理連結、Agent 用途與自訂服務仍是本機 demo；內建服務 badge／計數已讀 live API | localStorage 只負責 presentation edits；不得覆寫或冒充 provider connectivity |
| Supabase | Main migration／typed client 可重建；Teaching 是獨立唯讀來源 | 固定使用我方 staging；不拿 Dennis production DB 當測試環境 |

| Domain | UI／entrypoint | Current owner | Data／provider | 下一個 gate |
|---|---|---|---|---|
| Auth／後台 | `/login`、dashboard layout、`api/auth/**` | `modules/auth` | session、Main DB | release smoke |
| Operations／Goals | `/dashboard`、`/goals`、`/todos` | `modules/operations`、`goals`、`checklist` | Main + Teaching read | feature-driven |
| Knowledge Base | `/knowledge-base/**`、KB APIs／cron | `modules/knowledge-base` + consolidated Supabase／Firecrawl adapters | Main、Firecrawl、OpenAI | WP-11 |
| Meeting | `/meeting`、meeting APIs | `modules/meeting` + OpenAI adapters | Main、OpenAI realtime／audio | WP-10 |
| Visit | `/agents/visit`、LINE webhook、timeout、public respond | `modules/visit` + conversation lock／Visit adapters | Main、OpenAI、LINE、Google | WP-12／13 |
| Orders | `/agents/orders`、Teachify webhook | `modules/orders` + Orders adapters | Main、Teachify、LINE | WP-15／16 |
| Reporting | report／teamlead／schedule／expense、cron | `modules/reporting` | Main、OpenAI、Google、LINE | WP-14／15／17 |
| Support | `/agents/support`、support webhook／cron | `modules/support` | Main、support LINE／relay | WP-18 |
| Agent／Chat／Live Task | agent pages、super agents、TV | `modules/agents`、`agent-chat`、`live-task`、`tv` | Main、OpenAI、LINE | feature-driven |

## 4. 已完成 outcome ledger

| Outcome | Evidence／representative commit | Result |
|---|---|---|
| Runtime／產品面 baseline | route、UI、DB、provider maps；Playwright + Chrome | 公開／登入／後台 surface 可定位與驗證 |
| Main DB ownership | migration clean replay、generated `Database`、typed `getMainSupabase`、`schema:types:check` | Main schema 可重建；Teaching 分離 |
| Domain ownership consolidation | Goals、Checklist、Orders、Operations、KB、Meeting、Reporting、Support、Visit、Agent／TV／Live Task | 停止一條 route 一套 layers |
| OpenAI ownership | official `openai` SDK shared transport、domain adapters、fail-closed contracts | 一般 verify 不碰付費 provider |
| Integration safety | preflight、provider-specific opt-in、staging allowlist、精確 cleanup | 缺 key 時 fail closed，不偽裝成功 |
| Orders staging | `d3445ea`、`156781c` | 真實 app-client persistence／cleanup；DB error 回 503、不送 LINE |
| Conversation lock | `711dfd4` | compare-and-swap、contention／expiry／release 線上 staging 通過 |
| Visit terminal cleanup | `86c4590`、`a3873c7` | approval／offer／timeout terminal paths 都嘗試釋放 lock |
| OpenAI acceptance cost gate | `e0a5f02` | 每次批准 US$0.05～0.10；provider／DB 前拒絕錯誤設定 |
| OpenAI real acceptance | `npm run acceptance:openai` + Main staging query（2026-08-14） | Structured JSON、Embedding、Agent chat、TTS／STT、Realtime client secret、usage persistence 全數通過；fixture cleanup 0 |
| Knowledge Base real acceptance | `npm run acceptance:kb` + Firecrawl credit／Main staging query（2026-08-14） | 公開 KV README 單頁完成 scrape → draft → publish → vector index → semantic search；使用 1 credit，sources／docs／chunks cleanup 0，保留 3 筆 AI usage audit |
| Visit AI real acceptance | authenticated production API + Chrome `/agents/visit` + Main staging query（2026-08-14） | 合成名片五欄正確、邀約草稿成功、虛構對象研究明確回 empty／10% 且未捏造來源；profile／run／steps cleanup 0，保留 3 筆 AI usage audit，未寄 Gmail／LINE |
| Main Agent seed recovery | `20260813170350_seed_line_agents.sql` + online migration／insert-delete probe | clean schema 具備 12 個 canonical deployment rows；保留既有 settings／enabled，Visit activity 外鍵可寫入 |
| KB ownership repair | `firecrawl-client.ts` + `kb-crawl.ts` + focused contracts | Firecrawl protocol／quota／retry 與 Main persistence／ingestion 分責；source state／recheck DB 失敗不再偽裝成功；未新增 route-specific layers |
| KB atomic index replacement | `replace_kb_chunks` migration + focused unit／Main staging rollback acceptance + Chrome（2026-08-14） | OpenAI／RPC 失敗保留上一版可搜尋 index；成功時整批 transaction replace；service-role-only，fixture cleanup 0，UI/UX 未改 |
| Integrations live truth | `/integrations` + `integrationConnectionState` + Chrome（2026-08-14） | 原 UI/UX 下顯示 4 個 live connected：Teachify、Supabase、OpenAI、Firecrawl；Google／LINE／Meta 如實未連線，自訂 demo 不再冒充 connected |
| Google read real acceptance | `npm run acceptance:google:read` + Chrome `/integrations`（2026-08-14） | 專用 `KV Staging` OAuth client、Calendar／GA4／GSC production providers 4 tests passed；GA4 `524303407`、GSC `sc-domain:cablate.com` 可讀，Gmail／Calendar／GA4／GSC live connected；未建立行程或寄信 |
| Google write real acceptance | `npm run acceptance:google:write`（2026-08-14） | 唯一 allowlist `reahtuoo310109@gmail.com`；Calendar 建立／回讀／刪除與 Gmail send production providers 2 tests passed；測試行程已清除，測試信不可回收 |
| Visit delivery real acceptance | `npm run acceptance:visit:delivery` + Chrome public respond（2026-08-14） | Main synthetic invite → Visit application／adapters → Calendar／Gmail／activity 通過；Chrome location form → success page，console 0 error；Calendar 與 contact／invite／activity cleanup 皆確認 0 殘留，LINE 未呼叫成功且不影響主流程 |
| GA4／GSC live projections | `tests/e2e/live-overview-projections.spec.ts` + Chrome Agent／TV（2026-08-14） | 4 browser contracts 通過；Demo 模式維持既有固定資料。如實模式 Agent／TV 顯示 GA4 83 sessions、GSC 26 clicks／508 impressions；區間切換取消舊請求，loading／empty／error 不退回假資料 |
| Overdesign cleanup | `b16512f` | KB adapters 三檔合一、forwarding tests 三檔合一、移除單 caller 轉送與 source-string tests；淨少 111 行 |
| KB provider-disabled UI | `f0dff54` + Chrome evidence | 缺 Firecrawl key 時頁面可理解失敗並恢復操作；UI 未改 |
| Atomic Agent run usage | `logStep` + `add_run_cost` + online staging acceptance | 20 次並行 usage 更新完整保留：60 tokens／US$0.20、20 steps；fixture cleanup 0 |
| Current no-key verification | `npm run verify`、Playwright、online staging、CodeGraph、Chrome | 129 files／623 tests、93-page build、132 browser tests；Orders 1 + lock 2 + atomic cost 1 staging tests、fixture cleanup 0；Integrations／Knowledge Base／Visit 實機無 app error；2026-08-14 incremental graph sync 9 files／88 nodes |
| Primary composite acceptance | `npm run acceptance:primary:composites` + Main cleanup query + Chrome（2026-08-14） | Broadcast、Orders、Team Lead 依序完成 Main／OpenAI／Primary LINE；兩次各 3 則 allowlisted staging 訊息，第二次驗證 ID-diff cleanup；orders、broadcast logs、activities、subscriber tags、暫存 recipients 全數 0／還原 |

## 5. Active TODO

### WP-09 Upstream intake `[?]`

作者新增內容已讀到 `fanstudents/kv@d958a0b`：78 個變更檔、13 個 commits；與本 branch 有 29 個重疊檔，整包 merge 模擬會有 23 個衝突檔／45 個衝突區塊，因此不做 merge 或整顆 cherry-pick。

- [x] `logStep` 已改用 Main migration 的 typed `add_run_cost` RPC；unit contract 與 online staging 並行累加／cleanup 已通過。
- [ ] 將名片轉正、LINE 寄出／取消卡片、Firecrawl fallback、社群連結、劇院圖文／hold state 視為 Visit 功能需求，逐個移入現有 `modules/visit`／adapters並各自驗收；不復活舊 `src/lib/contact-research.ts` 或巨大 webhook。
- [?] 品牌改名與 Super Agent 展示頁是產品／UI 變更，需產品確認後才做。
- [x] 明確拒絕直接帶入：錯誤的 `gpt-realtime-2.1` 計價、尚未證明安全的 generic retry／Agent task runtime、414 行預設 Supabase config、後端硬等 4 秒與 DB base64 大圖做法。

### WP-10 OpenAI Real Acceptance `[x]`

Preparation 與真實 acceptance 已完成：Agent chat、Structured JSON、Embedding、TTS／STT、Realtime client secret、usage persistence／cleanup，以及 acceptance-specific cost gate。

- [x] `OPENAI_API_KEY` 只配置於 Git ignored `.env.local`；2026-08-14 已依官方文件重驗使用模型與 key 保管原則。因 key 曾經由聊天傳遞，完成本輪驗收後必須輪替。
- [x] `OPENAI_ACCEPTANCE=1`、`OPENAI_ACCEPTANCE_MAX_USD=0.05` 下執行 `npm run acceptance:openai`：1 file／1 test passed，14.49 秒。
- [x] 證明文字／JSON／向量／媒體／短效 token 與 `ai_usage_logs`；Main staging 查詢確認 acceptance fixture cleanup 殘留為 0。

### WP-11 Knowledge Base journey `[x]`

Preparation 已完成：crawl／import／draft／publish／discard／search／reindex／recheck contracts，以及 provider-disabled Chrome journey。

- [x] embedding 失敗 recovery 採「保留上一版可搜尋 index」：先完成全部 1536 維向量，再由 service-role-only `replace_kb_chunks` 於單一 transaction 刪舊／寫新；Main staging 已證明 invalid replacement 會 rollback，成功則完整替換，fixture cleanup 0。
- [x] `npm run acceptance:kb` 以公開 KV README 跑 Firecrawl → draft → publish → vector index → semantic search；opt-in gate 固定 Main staging、允許來源與最多 1 credit。
- [x] 依唯一 acceptance URL／source ID 精確清除 `kb_sources`、`knowledge_base`、`kb_chunks`；線上查詢三者殘留 0。Firecrawl 使用 1 credit，OpenAI 保留 3 筆 usage audit。
- [x] 依真實 journey 收斂：`firecrawl-client.ts` 負責 HTTP／quota／retry，`kb-crawl.ts` 保留 Main source state／shared ingestion；API、資料格式與 UI 不變，沒有 generic crawler、route-specific layers 或轉送介面。
- [x] source lookup／check-in／refresh／reviewing／recheck 的 Main DB error 全部被檢查；單一來源 recheck 失敗仍不阻塞其他來源，但不再被計入 checked／changed 成功，並留下 server diagnostic。

### WP-12 Visit AI journey `[x]`

Change contract：範圍只含 `parse-card`、`draft-email`、Contact Research 與其 Main DB／Chrome projection；不寄 Gmail／LINE、不改 UI。成功與失敗時 `research-search` step 都必須離開 `running`，run／profile／activity 必須與結果一致；AI usage 保留，synthetic fixture 精確清除。

- [x] 合成名片經真實 `gpt-4o` structured output 正確辨識姓名、公司、職稱、Email、電話，usage 已落 Main。
- [x] `gpt-4o-mini` 邀約信成功；虛構姓名／公司經 Web Search 回 empty、0 links／sources、10% confidence，沒有捏造公開資料。
- [x] Chrome `/agents/visit` 顯示相同 empty profile、無 app console error；清除後 profile／run／steps 都為 0，三筆 usage audit 保留。
- [x] 修正 research search step 只寫 `running` 的不一致；成功補 `done`、失敗補 `failed`，focused unit contract 與全量 verify 通過。
- [x] 補上 idempotent `line_agents` seed migration；我方 staging 已有 12 rows，activity insert／delete probe 通過。原先 activity 缺失是空父表造成，不是 provider 成功的證據。

### WP-13 Visit delivery／recovery `[?][!]`

已完成：LINE signature／channel contracts、approval／offer／public respond／timeout 狀態契約、Google MIME／Calendar create mapping、atomic lock、所有 terminal lock cleanup。

Delivery change contract：範圍只含既有 public respond 的 Main staging、Calendar、Gmail 與 activity 寫入，不改 UI／API payload、不使用 LINE 正式身份；唯一外寄對象為 `GOOGLE_WRITE_ACCEPTANCE_RECIPIENT`。成功必須持久化非空 `calendar_event_id` 並留下 success activity；Main 寫入或 Google 未回傳 ID 必須 fail closed；Calendar／DB synthetic fixtures 必須精確清除，已寄 Gmail 不可回收。

- [?] 決定 Calendar 已建立、Gmail 或後續 DB／LINE 失敗時的 durable state 與人工補救。現況會有 `calendar_event_id` 但 invite 可能被標 `failed`，重送又被既有 event 擋下。
- [?] 決定 timeout 已寫 `timed_out` 後，tag／activity／LINE 部分失敗是否重播及如何避免重複通知。
- [x] 同一 allowlist 的 public respond → Main → Calendar／Gmail → activity staging journey 已由 acceptance 與 Chrome 各通過一次；Calendar／DB fixture 均清除，Gmail 測試信保留作為外部證據。
- [ ] 完整 inbound → approval → public respond → LINE 仍待 LINE credentials／allowlisted user。

### WP-14 Google reads `[x]`

OAuth、Calendar、GA4、GSC 的 config failure、refresh、query mapping、empty／error fallback contracts 與 production-provider acceptance 已完成。

Projection change contract：只含 `/agents/report`、`/agents/expense` 與 TV 的 Ivy／Leo 數據卡；Demo 模式、既有版面、API payload 與其他 Agent 不變。如實模式必須讀真實 API，7／14／30 天舊請求不得覆蓋新選擇，loading／empty／provider error 必須誠實呈現，不做 Google 寫入。

- [x] 專用 `KV Staging` OAuth client 已配置於 Git ignored `.env.local`；Data／Admin／Search Console APIs 已啟用，Calendar write、Gmail send、GA4 read、GSC read scopes 已由測試帳號授權。
- [x] `npm run acceptance:google:read` 直接跑 shared auth、Calendar、GA4、GSC production providers：1 file／4 tests passed；Google API 列表確認 GA4 `CabLate` (`524303407`) 與 GSC `sc-domain:cablate.com` 權限，Chrome `/integrations` 顯示四項 live connected。
- [x] 本批只讀 Calendar／GA4／GSC；沒有建立行程或寄 Gmail。Token expiry 由 shared OAuth refresh path 實際換取 access token 證實；quota／provider errors 已由既有 contracts 覆蓋，不做破壞性 quota 測試。
- [x] `npm run acceptance:google:write` 以唯一 allowlisted recipient 跑 production providers：Calendar 建立、回讀、刪除與 Gmail send 共 2 tests passed；provider 未回傳 event／message ID 時 fail closed，Calendar fixture 已清除。
- [x] `/agents/report`、`/agents/expense` 與 TV 的 Ivy／Leo projection 已在如實模式接回真實 API；Demo 模式仍用原固定資料。缺資料或 provider 失敗時不會偷偷退回 demo；其他尚無 provider 的行銷 Agent 維持真實狀態卡。

### WP-15 LINE journeys `[~]`

primary／support channel isolation、signature、reply／push payload、缺 token／provider failure contracts 已完成。Primary staging channel 已獨立建立並完成 KV 應用層驗收；Support 與 inbound webhook 尚未完成。

#### Primary LINE acceptance contract（active）

- **範圍／非目標：** 本批只驗 primary channel 的 Agent test-push；不啟用 webhook、不碰既有正式 LINE、不驗 support channel、broadcast、Orders 或 Reporting。
- **入口與消費者：** Chrome `/agents/visit` → `POST /api/agents/[slug]/test-push` → `runAgentTestPush` → LINE Messaging API ＋ Main `line_agent_activity`。
- **輸入與狀態：** Git-ignored staging credentials、單一 `LINE_ACCEPTANCE_USER_ID` allowlist、Main `kv-staging`、文字訊息；acceptance 必須由 `LINE_PRIMARY_ACCEPTANCE=1` 明確開啟。
- **輸出與副作用：** LINE 成功收到一則 UTF-8 訊息，Supabase 寫入一筆 success activity；自動 acceptance 結束後刪除該筆 fixture。Chrome 實機證據完成後也刪除人工測試紀錄。
- **UI 狀態：** 保留既有 sending／sent／error 畫面；推播成功但 activity 寫入失敗時，回傳「已送出但紀錄失敗、請勿重複發送」，不得顯示完整成功。
- **不變條件：** `support` slug 仍只使用 `LINE_SUPPORT_CHANNEL_*`；其他 slug 使用 primary；測試對象必須明確輸入，repo 不得內建預設收件人；不把任何 secret、token 或 user ID 提交到 Git。
- **驗收例：** 在 Coco 頁輸入 staging allowlisted user 並送出純文字通知後，畫面顯示「已送出！請查看 LINE」，LINE 收到可讀中文，執行紀錄新增 success；DB 寫入失敗時不得顯示 sent。
- **測試映射／證據：** `tests/unit/agent-test-push*.test.ts`、`tests/unit/agent-admin-routes.test.ts`、`npm run acceptance:line:primary`、production build、Chrome `/agents/visit`（2026-08-14）。
- **刻意變更：** activity insert error 從靜默忽略改為 fail-closed；成功送達但紀錄失敗被分類為 partial failure；移除寫死的 LINE 測試收件人，保留既有手動輸入與本機記憶行為。
- **待決：** public staging URL／webhook、第二組 support channel、rate limit／retry／duplicate recovery，以及 broadcast／Orders／Reporting／Support composite journeys。

- [x] 建立獨立 primary staging channel、設定 credentials 與 allowlisted user；驗 KV Agent push、UTF-8、Main activity persistence、fixture cleanup、Chrome sent/error 狀態。
- [ ] 建立並驗證獨立 support staging channel，不混用 primary identity。
- [ ] 取得 public staging URL，驗 signature、inbound webhook、reply 與 Visit inbound journey。
- [ ] 驗 primary／support 的 rate limit、provider failure、重送與 duplicate recovery。
- [x] Broadcast、Orders、Team Lead Reporting 已在 Primary LINE allowlist 完成 composite acceptance、DB diff、Chrome 與 cleanup；Support 仍依 WP-18 使用獨立身分驗收。

### WP-16 Teachify Orders `[~][!]`

signature、payload mapping、Orders repository 線上 staging、upsert、cleanup、DB fail-closed 已完成。

- [?] 決定同 order 重送／狀態更新是否再次通知，以及 out-of-order event 的人工 recovery。
- [x] **自主範圍：**以去識別 fixture、Primary LINE allowlist 驗 application → Main → LINE → activity／cleanup；provider route signature 仍依下一項外部 gate，不冒充 Teachify provider acceptance。
- [!] **外部 gate：**取得 Teachify 實際 signature 規格／sandbox secret 與一筆可重播去識別 event 後，才把 provider truth 標為完成。

### WP-17 Reporting `[~]`

- [x] **可自主：**暫時把 Team Lead `reportTo` 指向既有 Primary LINE allowlist，完成 Main → OpenAI summary／usage → LINE、activity ID-diff cleanup 與頁面還原；manual／cron 共用 runner 已由 route contracts 覆蓋。Hosted schedule 仍依下一項外部 gate。
- [!] **外部 gate：**正式排程仍需 canonical GitHub repo、repo secret、部署環境與通知 owner；在此之前不得把 local cron acceptance 說成 production schedule 已完成。

### WP-18 Support `[!]`

- [x] **可自主到 gate：**`npm run acceptance:support:main` 以合成 conversation、local relay double 與測試程序內隨機 `SUPPORT_LOG_SECRET` 驗 capture、受保護 callback log、daily report、Main persistence、delivery failure 與精確 cleanup；1 file／2 tests passed，conversation／subscriber／activity 殘留為 0，Chrome `/agents/support` 已確認設定與活動回復。全程未呼叫 LINE、OpenAI 或舊客服 endpoint。
- [!] **外部 gate：**獨立 Support LINE channel 三項 credentials、測試 user、舊客服 webhook 的 safe relay target／owner，以及 public staging deployment；缺任一項都不能宣稱 Support end-to-end 完成。

### WP-20 Targeted reliability `[?]`

只修 WP-10～18 真實 evidence 暴露的故障：每項先定 idempotency、retry、timeout、partial failure、replay與 manual recovery；只有兩個真實 consumer 或共同故障模式才抽 shared primitive。優先用既有 `agent_runs`、`agent_run_steps`、`ai_usage_logs`、activity，不建平行 runtime。

- [x] Broadcast、Orders、Team Lead 與 Support 的「外部副作用已成功但 activity 寫入失敗」不再被誤報成單純 delivery failure；回應會明確要求不得重送，DB adapters 不再吞 activity／conversation errors。
- [x] Support relay 維持 LINE 200 ACK 避免 provider retry 重複轉發舊客服，但 application 會回傳 forward／audit／subscriber／activity／conversation 的結構化 isolated failures，route 寫入 server diagnostics，不再由 `Promise.allSettled` 靜默吞錯。
- [x] Visit 已收斂共置的 legacy adapters 保留為真實 LINE／Main／舊 schema 邊界，但 contact、offer、activity、workflow、invite 與 settings 的 Supabase errors 全部 fail-closed，不再偽裝成 missing/default/success；未新增 route-specific wrapper。
- [x] Shared subscriber `touch` 的 lookup／last-seen／profile／insert errors 已改為 fail-closed，讓 Support relay 能正確回報 subscriber isolated failure，而不是在 DB 失敗時仍宣稱建檔成功。
- [x] Visit 共用 contact tag 的 lookup／write errors 已改為 fail-closed；名片／offer／timeout 流程不再於標籤未落 DB 時取得假成功，純列表讀取仍保留 starter tags fallback。
- [x] KB index replacement 已採 transaction 原子替換，provider／RPC 失敗不再清空可用索引；草稿／封存仍以空 replacement 清除既有 chunks，維持原產品契約。
- [?] Visit 多副作用 phase、Teachify duplicate／stale event 與 Support relay retry 仍需依 P3 核准產品語意後實作，不以 generic retry 猜測處理。

### WP-21 CI／deploy／rollback `[!]`

本地 CI、scheduled workflows、Playwright diagnostics 已存在；作者 repo 已確認為 `upstream/fanstudents/kv`，但 `origin` 已失效、canonical remote／branch policy 尚未定案。`https://kva.zeabur.app` 於 2026-08-14 已回 200，LINE／Teachify GET health routes 也存在，但頁面品牌為 MixAgent，無版本／commit 證據；因此它是「存活但 ownership／revision／staging 身分未知」，不得直接拿來做破壞性驗收或改 webhook。

- [ ] 恢復／確認 canonical GitHub repo、權限、branch policy；不 force-push。
- [~] 本 branch `npm run verify:full` 已通過 lint、typecheck、129 files／644 unit tests、93-page production build與 136-test hermetic browser smoke；另以 `npm run test:e2e:run:staging` 對真實 Main read paths 跑同一批 136 tests，無缺 Supabase env 日誌。locked install、hosted artifacts／flaky 分類仍待 canonical repo。
- [ ] 指定 scheduled failure 通知目的地／owner。
- [ ] 明確 deploy command、migration ordering、health check、promotion、app／secret／migration rollback與 release owner。

### WP-22 Final cleanup／handoff `[~]`

- [~] Main／OpenAI／Firecrawl／Google／Primary LINE 與 Support Main 自主 journeys 已達標；Support LINE、Teachify provider truth、Visit inbound、hosted schedule／deploy 仍有明確外部 gate，replay decisions 仍依 P3。
- [x] `/integrations` badge／計數已改綁 `/api/integrations/status` live truth並維持原 UI/UX；localStorage 僅保留管理連結、Agent 用途與自訂服務 demo，自訂項無 live probe 時顯示未連線。
- [~] 本輪 CodeGraph 沒找到可安全刪除的無 caller 模組；Visit `legacy-*` adapters 仍被 webhook／cron 真實呼叫，保留為外部／舊 schema 邊界。最後 transitional cleanup 要等 P6 evidence，不為減檔名硬刪。
- [~] 全量 verify、CodeGraph、22-file／106-test P4 contracts、7-page Chrome matrix、Main residue audit 與 staging browser matrix已完成；staging cutover／rollback rehearsal 仍待 deploy ownership。
- [ ] 只把穩定操作知識補進 README／runbook，不新增重複架構文件。

## 6. 自主邊界與仍需外部取得的資產

Secrets 只放 Git ignored `.env.local` 或正式 secret store；不要貼進 Git、TODO、測試 fixture或聊天回報。

目前不需要再取得 Main Supabase、OpenAI、Firecrawl、Google 或 Primary LINE 才能繼續工程工作。`CRON_SECRET`、`SUPPORT_LOG_SECRET` 是我方內部 secret，可自行安全產生，不應算成外部 blocker。真正仍需外部提供的是 Support LINE、Teachify provider truth、safe relay、部署／canonical repo，以及產品決策；Main Supabase credentials 已設定，不列入待取得數量。

| 優先 | Service | 需要取得／設定 | 同時要準備的安全資產 | 解鎖 |
|---|---|---|---|---|
| 1 | OpenAI | 已配置並完成 US$0.05 gate acceptance；因曾透過聊天傳遞，仍需由帳號 owner 輪替 key | 無個資 synthetic fixture | WP-10 完成；WP-11／12／17 AI 已解鎖，輪替是 release gate |
| 2 | Firecrawl | 已配置免費帳號 key；`FIRECRAWL_API_BASE` 使用官方預設 | 公開 KV README、單頁／1-credit gate | WP-11 provider journey 已通過 |
| 3 | Google OAuth | 已配置 `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`GOOGLE_REFRESH_TOKEN`；write allowlist 已配置於 Git ignored `.env.local` | Calendar／GA4／GSC read、Calendar／Gmail write provider 與 Visit composite journey 已通過 | WP-13／14 的 Google 範圍完成 |
| 4 | Google analytics | 已配置 `GA4_PROPERTY_ID`、`GSC_SITE_URL`；`GOOGLE_ADDITIONAL_CALENDAR_IDS` 仍選配 | GA4／GSC production-provider read 已通過 | WP-14 完成；WP-17 已解鎖 |
| 5 | LINE primary | 已配置 `LINE_CHANNEL_ID`、`LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN` 與單一 allowlisted user | 每個 acceptance 暫時寫入精確 recipient／fixture，結束後復原；不把 user ID 寫入 Git | WP-13／15／16／17 可自主繼續 |
| 6 | LINE support | `LINE_SUPPORT_CHANNEL_ID`、`LINE_SUPPORT_CHANNEL_SECRET`、`LINE_SUPPORT_CHANNEL_ACCESS_TOKEN` | support 測試 user／channel，不與 primary 混用 | WP-15／18 |
| 7 | Teachify | `TEACHIFY_WEBHOOK_SECRET` | sandbox／去識別 order event、可重播 event ID | WP-16 |
| 8 | Cron／Support | `CRON_SECRET`、`SUPPORT_LOG_SECRET` 可自行產生；只有 `SUPPORT_RELAY_TARGET_URL` 必須由舊客服系統 owner 確認 | safe relay endpoint、通知 owner；local secret 不進 Git | WP-17 可自主；WP-18 relay／WP-21 hosted schedule 仍有外部 gate |
| 9 | GitHub／Zeabur | `upstream/fanstudents/kv` 可讀且已有本 branch；`origin/cablate/kv` 失效。需決定 canonical repo、write policy、deploy project／secret owner | `kva.zeabur.app` 存活但 revision／用途未知；需要獨立 staging 身分、health version、rollback owner | WP-21／22 |

Main `kv-staging` 的 Supabase env 已設定；Orders 與 conversation lock integration 已可重跑，不需再建立本地業務 DB。現有 `line_agents` 的 Team Lead／Orders／Support `reportTo` 均未設定，但這不是外部 credential：可在受控 acceptance 中暫時指向既有 allowlisted Primary LINE user，測完精確復原；Support 正式身份仍不得借用 Primary channel。

## 7. 後續主線（唯一執行順序）

### 7.1 Outcome 與 guardrails

- **Primary outcome**：在 UI／UX、既有 API 與既有資料格式未經核准不變的前提下，把 KV 整理成可發布、可維護、可擴充且能安全承接需求的產品 codebase。
- **自主 outcome**：先關閉 Primary LINE、Orders、Team Lead Reporting 與本地 provider-contract 的證據缺口，不等待無關的外部資產。
- **Provider outcome**：在隔離 staging 與 allowlist 中完成真實 LINE inbound、Teachify、Support 與 hosted schedule journey；fixture 必須可識別且可還原。
- **Operational outcome**：建立 canonical repo／branch、可辨識版本的 deploy、migration ordering、CI、promotion 與 rollback truth。
- **Guardrails**：不借用正式客戶或 Support 身分做測試；不以 mock 冒充 provider 驗收；不為未確認需求預建通用 Agent runtime／plugin／multi-tenant framework；不再每條 route 複製一組 rules／ports／application／adapter。

### 7.2 權限分類

| 類別 | 意義 | 處理方式 |
|---|---|---|
| A | 現在可自主完成 | 直接執行、驗證、cleanup、commit |
| G | 可自主做到外部驗收門前 | 完成本地 contract／fixture／failure evidence，清楚標示尚非 provider 完成 |
| D | 需要產品／可靠性決策 | 先記錄建議與不變條件，未核准不偷偷改變語意 |
| E | 需要外部資產或 ownership | 列出最小取得物；其他不相依工作繼續 |

### 7.3 依賴圖

```text
P0 Scope control（D，不阻塞 P1／P2／P4） ────────────────────┐
P1 驗收護欄（A） ──> P2 Primary composite（A） ──────────────┤
        └──────────> P4 本地 provider readiness（G） ─┐      │
P3 Recovery 決策（D） ────────────────────────────────┼─> P6 真實 provider journeys ─┤
P5 外部 staging 資產（E，可平行取得） ─────────────────┘      │
                                                               v
P7 核准需求／證據驅動修復與收斂（A） -> P8 CI／deploy／rollback（E） -> P9 cleanup／交接
```

### 7.4 Work packages 與退出條件

0. **P0 — Scope control（D，不阻塞 P1／P2／P4）**
   - 確認 9 月底推廣版的使用者、必含能力、明確不做項、驗收 journey 與 release owner。
   - 逐項裁決 upstream 候選：名片轉正、LINE 寄出／取消卡片、Firecrawl fallback、社群連結、劇院圖文／hold state；只把核准項目沿現有 Visit／KB owner 手工移植，不 merge 整包 upstream。
   - 品牌改名與 Super Agent 展示是產品／UI 需求，另立 change contract，不混入保持 UI 不變的結構整理。
   - **Exit**：每個候選有 accept／defer／reject、owner、journey 與 guardrail；未決項不阻塞下面不相依的 acceptance。

1. **P1 — 驗收護欄（A）**
   - [x] 本地已產生並設定 Git ignored 的 `CRON_SECRET`、`SUPPORT_LOG_SECRET`；它們不是外部 blocker，也未寫入文件或 commit。
   - 建立 acceptance recipient allowlist、具名 fixture、資料／設定 snapshot 與精確 restore；不得使用正式客戶 recipient。
   - 固定每批流程：CodeGraph 找 owner／consumer → 固定契約 → 完成同批修改 → focused tests → affected Chrome journey → heavy verify → cleanup → coherent commit。
   - **Exit**：所有後續 side effect 都有 allowlist、前後 snapshot、cleanup 與失敗停止條件。

2. **P2 — Primary composite 驗收（A）**
   - [x] Broadcast：只建立一筆 Primary LINE allowlisted subscriber，驗 push／activity／count 後刪除 fixture。
   - [x] Orders：用去識別 fixture 經 application → Main DB → Primary LINE；暫時設定 `orders.settings.reportTo`，完成後原樣還原。Teachify provider signature 仍屬 P5／P6。
   - [x] Team Lead Reporting：用 Main + OpenAI + Primary LINE 驗共用 manual／cron runner；暫時設定 `teamlead.settings.reportTo` 後還原。
   - [x] `/subscribers`、`/agents/orders`、`/agents/teamlead` 改前／後與 cleanup 後皆以 Chrome 驗證；console 0 error，Orders fixture 曾被 Chrome 抓出後改用 ID 差集修正並二次驗收。
   - **Exit（已達成）：**三條 journey 的輸入、DB diff、LINE receipt、Chrome evidence、cleanup 成對存在；`npm run acceptance:primary:composites` 為可重跑入口。

3. **P3 — Recovery／replay 決策（D，可與 P2 平行）**
   - [x] KB embedding：先產生並驗證全部新 chunks，再以 service-role-only transaction 替換；Main staging rollback／replace、權限與 cleanup 已通過，失敗時保留上一版可搜尋 index。
   - Visit delivery：建議記錄 Calendar／Gmail／LINE 各 phase，重試只補未完成副作用，不重建 Calendar、不重寄已寄 Gmail。
   - Visit timeout：建議狀態與通知具備可重入 phase；partial failure 重試只完成缺少步驟。
   - Teachify：建議拒絕 stale event，只有實際狀態 transition 才通知；duplicate event 不重複 LINE push。
   - **Exit**：每項有 approved behavior、idempotency key、失敗後狀態與重試矩陣；核准前只測現況，不改產品語意。

4. **P4 — 本地 provider readiness（G）**
   - [x] Visit inbound：本地 LINE signature、parsing、route、application 與 delivery failure contracts 已重跑；不宣稱已驗真實 reply token、媒體下載或 LINE callback。
   - [~] Teachify：valid／invalid signature、parse、DB、LINE delivery 與 delivered-but-unrecorded contracts 已通過；duplicate／out-of-order 仍缺官方 event／timestamp truth 與 P3 核准語意，未自行猜測。
   - [x] Support：local signature／route contracts、synthetic conversation、relay double、Main capture／callback／report、failure 與 cleanup 已通過；未借用 Primary LINE channel，也未宣稱真實 Support provider 完成。
   - **Exit `[~]`**：22 files／106 tests 證明三個 adapter 的既有本地成功／失敗路徑；只剩 Teachify duplicate／out-of-order 要在 P3/P5 truth 後補，provider 尚缺項已列明。

5. **P5 — 外部資產（E，可與 P1–P4 平行取得）**
   - Support LINE：專用 channel ID／secret／access token、測試 user／room，以及可安全改 webhook 的 owner。
   - Teachify：官方實際 signing spec／secret，加一筆 sandbox 或去識別可重播事件。
   - Support relay：既有客服 webhook target、owner 與 failure／rollback 聯絡人。
   - Deploy：canonical GitHub repo／branch、Zeabur project ownership、獨立 staging URL、revision／commit 可見性、secret store 與 release owner。`kva.zeabur.app` 現在可回 200 且有 webhook routes，但尚不能證明它是本 branch、隔離 staging 或可安全覆寫的環境。
   - Security／產品：輪替曾貼入對話的 OpenAI key；確認 9 月底 scope／acceptance journeys、品牌與 super-agent 範圍。
   - **Exit**：每項都能指出 owner、環境、用途、允許副作用、撤回方法；只取得真正缺少的資產。

6. **P6 — 真實 provider journeys（G + E）**
   - 部署目前驗證過的 commit 到獨立 staging，health/version 能對應 commit；先套 migration 再切流量。
   - Primary LINE：真實 inbound Visit text／image／postback、Calendar／Gmail／LINE 回覆與 timeout，全部限制測試 recipient。
   - Teachify：真實 provider signature／event → Orders persistence → 去重／replay → Primary LINE。
   - Support：專用 Support LINE inbound → capture → relay；確認既有客服 bot 回覆 owner，不讓 KV 搶答。
   - Reporting：GitHub hosted schedule → cron auth → Team Lead／Support report；Support delivery identity 先確認，不預設使用 Primary channel。
   - **Exit**：每條 journey 有 provider receipt、DB diff、UI evidence、cleanup、failure／retry evidence 與 owner sign-off。

7. **P7 — 核准需求與證據驅動的可靠性／架構收斂（A）**
   - 先把 P0 核准的功能逐條做成垂直 slice；每條都沿既有 domain owner 實作，不把 upstream 舊架構帶回來。
   - 只修 P2／P4／P6 暴露的 retry、idempotency、partial failure、observability 或契約問題；不再推測式搬檔。
   - 把重複 route wrappers、過細 rules／ports／application／adapter 收斂到 domain owner；保留確實隔離 provider／DB 的 adapter，不保留只轉呼叫的儀式層。
   - 以成熟 npm 套件取代已盤點、測試成本高且無產品差異的自造輪；每項先比較 bundle、維護度、契約與 migration cost，不做整包換框架。
   - **Exit**：新增抽象有至少兩個真實 consumer；刪除或合併的模組有 caller evidence；LOC／檔案數不因儀式層持續膨脹。

8. **P8 — CI／deploy／migration／rollback（E）**
   - 在 canonical repo 跑 hosted CI：install、lint、typecheck、unit／integration、build、Playwright smoke 與 artifacts。
   - 固定 deploy command、migration ordering、health/version、canary／promotion、DB backup／restore 與 application rollback runbook。
   - 將 hosted cron secrets 放入 repo／deploy secret store，不寫入文件或 git；實際觸發 schedule。
   - **Exit**：從指定 commit 可重現 staging deploy、migration、smoke、promotion 與 rollback；責任人明確。

9. **P9 — Final cleanup 與交接（A）**
   - 刪除確定無 caller 的 dead code、誤用 demo data 與已完成使命的 transitional adapters；不清理未知 upstream 功能。
   - 跑完整 lint／typecheck／test／build／browser／provider matrix，更新 CodeGraph 與最小必要 README／runbook／本 TODO。
   - 列出已驗、未驗、已接受風險、營運 owner 與下一批需求入口。
   - **Exit**：乾淨 worktree、可追溯 commits、零遺留 fixture、文件與實際 revision 一致，可由另一位工程師依文件重現。

## 8. Readiness verdict

- **現在不是卡死**：P1、P2、P4 以及 P3 的決策草案都能自主往前；Primary LINE、Main／Teaching DB、OpenAI、Firecrawl、Google 已可用，內部 cron／support log secret 可自行產生。
- **現在也不是「只差測試」**：骨架與主要 domain ownership 已就位，但 Visit／Teachify／Support 的 recovery／replay 語意仍需決策；過細 wrapper 要在真實 evidence 後收斂，不能直接宣告 architecture 完成。
- **真正外部 gate**：Support 專用 LINE、Teachify 真實簽章素材、Support relay target、canonical repo／Zeabur staging ownership、OpenAI key rotation，以及 9 月底產品 scope／release owner。
- **建議立即順序**：P1 → P2；同時完成 P3 草案與 P4。等待 P5 時不中斷；資產到齊後只跑 P6，再依 evidence 做 P7，最後 P8、P9。
- **禁止誤判**：本地自簽 fixture 只證明我們的 contract；可回 200 的 `kva.zeabur.app` 只證明 domain 存活。兩者都不能替代 provider receipt、commit identity、隔離 staging 或 rollback truth。

## 9. 文件政策

- 只保留本文件的 current truth、active TODO、blocker、key matrix與 readiness；完成細節壓成 outcome ledger。
- CodeGraph、source、tests、Git、staging query與 Chrome 保存執行證據；本文件不複製流水帳。
- 每次 meaningful drift 更新狀態並刪除過期敘述，不讓 TODO 再膨脹成歷史報告。
