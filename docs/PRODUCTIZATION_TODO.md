# KV 產品化控制清單

> 這是唯一的產品化 TODO、現況索引與 readiness 判定。Git 保存歷史，不另建 TODO v2、重構日誌或重複 architecture 文件。

## 1. 目標、邊界與完成條件

目標：在原 repository 內漸進整理 KV，使工程團隊能理解、驗證、修改、部署與擴充；既有 UI／UX、API、資料格式與外部 side effects 除非另有產品需求，全部保持不變。

狀態：`Active`｜Repo：`F:/ownproject/kv`｜Branch：`codex/kv-wp0-toolchain`｜環境：Main `kv-staging` + 獨立唯讀 Teaching DB｜判定：`Architecture ready for scoped KV delivery; needs external acceptance and release truth`

### 換機接續 checkpoint（2026-08-06）

- Git snapshot：`codex/kv-wp0-toolchain`／`725ef59` 起，收尾 commit 見 branch tip；checkpoint 前工作樹乾淨。CodeGraph 為 442 files／3,754 nodes／7,730 edges，無 pending drift。
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
| KB ownership repair | `firecrawl-client.ts` + `kb-crawl.ts` + focused contracts | Firecrawl protocol／quota／retry 與 Main persistence／ingestion 分責；production code 淨少 7 行，未新增 route-specific layers |
| Integrations live truth | `/integrations` + `integrationConnectionState` + Chrome（2026-08-14） | 原 UI/UX 下顯示 4 個 live connected：Teachify、Supabase、OpenAI、Firecrawl；Google／LINE／Meta 如實未連線，自訂 demo 不再冒充 connected |
| Google read real acceptance | `npm run acceptance:google:read` + Chrome `/integrations`（2026-08-14） | 專用 `KV Staging` OAuth client、Calendar／GA4／GSC production providers 4 tests passed；GA4 `524303407`、GSC `sc-domain:cablate.com` 可讀，Gmail／Calendar／GA4／GSC live connected；未建立行程或寄信 |
| Google write real acceptance | `npm run acceptance:google:write`（2026-08-14） | 唯一 allowlist `reahtuoo310109@gmail.com`；Calendar 建立／回讀／刪除與 Gmail send production providers 2 tests passed；測試行程已清除，測試信不可回收 |
| Visit delivery real acceptance | `npm run acceptance:visit:delivery` + Chrome public respond（2026-08-14） | Main synthetic invite → Visit application／adapters → Calendar／Gmail／activity 通過；Chrome location form → success page，console 0 error；Calendar 與 contact／invite／activity cleanup 皆確認 0 殘留，LINE 未呼叫成功且不影響主流程 |
| GA4／GSC live projections | `tests/e2e/live-overview-projections.spec.ts` + Chrome Agent／TV（2026-08-14） | 4 browser contracts 通過；Demo 模式維持既有固定資料。如實模式 Agent／TV 顯示 GA4 83 sessions、GSC 26 clicks／508 impressions；區間切換取消舊請求，loading／empty／error 不退回假資料 |
| Overdesign cleanup | `b16512f` | KB adapters 三檔合一、forwarding tests 三檔合一、移除單 caller 轉送與 source-string tests；淨少 111 行 |
| KB provider-disabled UI | `f0dff54` + Chrome evidence | 缺 Firecrawl key 時頁面可理解失敗並恢復操作；UI 未改 |
| Atomic Agent run usage | `logStep` + `add_run_cost` + online staging acceptance | 20 次並行 usage 更新完整保留：60 tokens／US$0.20、20 steps；fixture cleanup 0 |
| Current no-key verification | `npm run verify`、Playwright、online staging、CodeGraph、Chrome | 129 files／623 tests、93-page build、132 browser tests；Orders 1 + lock 2 + atomic cost 1 staging tests、fixture cleanup 0；Integrations／Knowledge Base／Visit 實機無 app error；2026-08-14 incremental graph sync 9 files／88 nodes |

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

### WP-11 Knowledge Base journey `[?]`

Preparation 已完成：crawl／import／draft／publish／discard／search／reindex／recheck contracts，以及 provider-disabled Chrome journey。

- [?] 決定 embedding 失敗 recovery：保留舊 chunks、標記 unavailable，或明確要求 reindex。目前 `indexDocs` 先刪舊 chunks 再 embedding，不能擅改語意。
- [x] `npm run acceptance:kb` 以公開 KV README 跑 Firecrawl → draft → publish → vector index → semantic search；opt-in gate 固定 Main staging、允許來源與最多 1 credit。
- [x] 依唯一 acceptance URL／source ID 精確清除 `kb_sources`、`knowledge_base`、`kb_chunks`；線上查詢三者殘留 0。Firecrawl 使用 1 credit，OpenAI 保留 3 筆 usage audit。
- [x] 依真實 journey 收斂：`firecrawl-client.ts` 負責 HTTP／quota／retry，`kb-crawl.ts` 保留 Main source state／shared ingestion；API、資料格式與 UI 不變，沒有 generic crawler、route-specific layers 或轉送介面。

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

### WP-15 LINE journeys `[!]`

primary／support channel isolation、signature、reply／push payload、缺 token／provider failure contracts 已完成。

- [ ] 取得兩組 channel credentials 與明確 allowlisted user；分開驗 Agent push、broadcast、Orders／Reporting、Support delivery。
- [ ] 驗 rate limit／provider failure與重送，不混用 primary／support identity。

### WP-16 Teachify Orders `[?][!]`

signature、payload mapping、Orders repository 線上 staging、upsert、cleanup、DB fail-closed 已完成。

- [?] 決定同 order 重送／狀態更新是否再次通知，以及 out-of-order event 的人工 recovery。
- [ ] 用 sandbox／去識別 event 驗 Teachify webhook；LINE delivery 依 WP-15 allowlist。

### WP-17 Reporting `[!]`

- [ ] 以真實受控資料驗 manual／cron 一致、OpenAI summary／usage、Google reads、LINE delivery、replay與頁面。

### WP-18 Support `[!]`

- [ ] 以 support channel、合成 conversation、safe relay target 驗 inbound → relay／callback → delivery → daily report。

### WP-20 Targeted reliability `[?]`

只修 WP-10～18 真實 evidence 暴露的故障：每項先定 idempotency、retry、timeout、partial failure、replay與 manual recovery；只有兩個真實 consumer 或共同故障模式才抽 shared primitive。優先用既有 `agent_runs`、`agent_run_steps`、`ai_usage_logs`、activity，不建平行 runtime。

### WP-21 CI／deploy／rollback `[!]`

本地 CI、scheduled workflows、Playwright diagnostics 已存在；作者 repo 已確認為 `upstream/fanstudents/kv`，但 `origin` 已失效、canonical remote／branch policy 尚未定案。scheduled URLs 指向 `https://kva.zeabur.app`，部署真相仍未知。

- [ ] 恢復／確認 canonical GitHub repo、權限、branch policy；不 force-push。
- [ ] 驗 locked install、lint、typecheck、unit、build、browser smoke、artifact與 flaky 分類。
- [ ] 指定 scheduled failure 通知目的地／owner。
- [ ] 明確 deploy command、migration ordering、health check、promotion、app／secret／migration rollback與 release owner。

### WP-22 Final cleanup／handoff `[ ]`

- [ ] Provider journeys 與已選 reliability decisions 達標；未執行項有接受理由。
- [x] `/integrations` badge／計數已改綁 `/api/integrations/status` live truth並維持原 UI/UX；localStorage 僅保留管理連結、Agent 用途與自訂服務 demo，自訂項無 live probe 時顯示未連線。
- [ ] 移除最後 dead code、過渡 re-export／flag、過期 tests、demo fallback 誤用與未接 composition。
- [ ] 全量 verify、CodeGraph、關鍵 UI／API／provider matrix、staging cutover／rollback rehearsal。
- [ ] 只把穩定操作知識補進 README／runbook，不新增重複架構文件。

## 6. 你回來後要取得的 credentials／資產

Secrets 只放 Git ignored `.env.local` 或正式 secret store；不要貼進 Git、TODO、測試 fixture或聊天回報。

Google OAuth 3 個 credential values、GA4／GSC 2 個設定值已配置；其餘待取得項目以本表為準。Main Supabase credentials 已設定，不列入待取得數量。

| 優先 | Service | 需要取得／設定 | 同時要準備的安全資產 | 解鎖 |
|---|---|---|---|---|
| 1 | OpenAI | 已配置並完成 US$0.05 gate acceptance；驗收後輪替 key | 無個資 synthetic fixture | WP-10 完成；WP-11／12／17 AI 已解鎖 |
| 2 | Firecrawl | 已配置免費帳號 key；`FIRECRAWL_API_BASE` 使用官方預設 | 公開 KV README、單頁／1-credit gate | WP-11 provider journey 已通過 |
| 3 | Google OAuth | 已配置 `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`GOOGLE_REFRESH_TOKEN`；write allowlist 已配置於 Git ignored `.env.local` | Calendar／GA4／GSC read、Calendar／Gmail write provider 與 Visit composite journey 已通過 | WP-13／14 的 Google 範圍完成 |
| 4 | Google analytics | 已配置 `GA4_PROPERTY_ID`、`GSC_SITE_URL`；`GOOGLE_ADDITIONAL_CALENDAR_IDS` 仍選配 | GA4／GSC production-provider read 已通過 | WP-14 完成；WP-17 已解鎖 |
| 5 | LINE primary | `LINE_CHANNEL_ID`、`LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN` | staging `line_agents.target_user_id` 指向明確測試 user | WP-13／15／16／17 |
| 6 | LINE support | `LINE_SUPPORT_CHANNEL_ID`、`LINE_SUPPORT_CHANNEL_SECRET`、`LINE_SUPPORT_CHANNEL_ACCESS_TOKEN` | support 測試 user／channel，不與 primary 混用 | WP-15／18 |
| 7 | Teachify | `TEACHIFY_WEBHOOK_SECRET` | sandbox／去識別 order event、可重播 event ID | WP-16 |
| 8 | Cron／Support | `CRON_SECRET`、`SUPPORT_LOG_SECRET`、`SUPPORT_RELAY_TARGET_URL` | safe relay endpoint、通知 owner | WP-17／18／21 |
| 9 | GitHub／Zeabur | canonical repo access、deploy project、secret owner | staging／production URL、health check、rollback owner | WP-21／22 |

Main `kv-staging` 的 Supabase env 已設定；Orders 與 conversation lock integration 已可重跑，不需再建立本地業務 DB。

## 7. 執行順序

1. 確認 9 月底 KV 推廣版本必須包含的功能與驗收 journey；未確認前仍可做下列獨立 acceptance，不推導其他商業場景。
2. [x] OpenAI 最窄付費 acceptance 已通過；usage fixture cleanup 0，驗收用 key 待輪替。
3. [?] Firecrawl + OpenAI 的 KB 單頁 journey、cleanup 與責任收斂已通過；只剩 embedding 失敗 recovery 產品決策。
4. [x] Google Calendar／GA4／GSC read-only、Calendar／Gmail write 與 Visit composite journey 已通過，Ivy／Leo 的 Agent 與 TV projection 已接回真實 API；Google 已不再是 Visit blocker。
5. Teachify sandbox event；先確認 replay 產品決策。LINE primary／support 只在測試 channel／recipient allowlist 準備好後分開驗，再接 Visit、Orders、Reporting、Support composite journeys。
6. 只依真實故障做 WP-20；接著恢復 remote、驗 CI／deploy／rollback。
7. WP-22 final cleanup、矩陣驗收與交接。

每個 slice 都要：CodeGraph 找 owner／consumer → 固定不變契約 → 完成同批程式碼 → focused tests → affected Chrome journey → heavy verify → 精確 cleanup → coherent commit。本來沒有 UI 的 API 才能以 API evidence 取代 Chrome；低等級 mock 不得冒充 provider／staging 完成。

## 8. Readiness verdict

- Healthy enough：整體骨架、Main／Teaching DB、核心 domain ownership、本地驗證、Orders staging、atomic conversation lock、provider-disabled behavior 都已就位；可直接承接已確認的 KV 功能需求，不需先完成全面重構。
- Not uniformly clean：Visit 仍有受控 legacy seam；Teachify／LINE 的完成度仍取決於真實 provider evidence；GA4／GSC／Calendar provider 與 Ivy／Leo live projection 已驗，但 Goals current 值與尚無 provider 的行銷 Agent 仍有明確 demo 邊界。
- Actually blocked：9 月底推廣版本的確切範圍、LINE／Teachify／cron credentials 與 safe recipients、三個產品 recovery 決策、canonical GitHub／Zeabur deploy與 rollback truth。Google read 已不再是 blocker。
- Safe work now：沿已確認的 KV 需求承接功能；其餘 upstream 內容按需求手工移植。避免再做全域搬檔、每 route 一套 layer 或預建通用 Agent／plugin／multi-tenant framework。
- 下一步：確認 9 月底推廣範圍與 KB embedding recovery；再依已取得的安全憑證逐批驗 LINE／Teachify／Reporting composite journey，不一次開所有 side effects。

## 9. 文件政策

- 只保留本文件的 current truth、active TODO、blocker、key matrix與 readiness；完成細節壓成 outcome ledger。
- CodeGraph、source、tests、Git、staging query與 Chrome 保存執行證據；本文件不複製流水帳。
- 每次 meaningful drift 更新狀態並刪除過期敘述，不讓 TODO 再膨脹成歷史報告。
