# KV 產品化控制清單

> 這是唯一的產品化 TODO、現況索引與 readiness 判定。Git 保存歷史，不另建 TODO v2、重構日誌或重複 architecture 文件。

## 1. 目標、邊界與完成條件

目標：在原 repository 內漸進整理 KV，使工程團隊能理解、驗證、修改、部署與擴充；既有 UI／UX、API、資料格式與外部 side effects 除非另有產品需求，全部保持不變。

狀態：`Active`｜Repo：`F:/ownproject/kv`｜Branch：`codex/kv-wp0-toolchain`｜環境：Main `kv-staging` + 獨立唯讀 Teaching DB｜判定：`Needs external acceptance and release truth`

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
| Overdesign cleanup | `b16512f` | KB adapters 三檔合一、forwarding tests 三檔合一、移除單 caller 轉送與 source-string tests；淨少 111 行 |
| KB provider-disabled UI | `f0dff54` + Chrome evidence | 缺 Firecrawl key 時頁面可理解失敗並恢復操作；UI 未改 |
| Current no-key verification | `npm run verify`、Playwright、online staging、CodeGraph、Chrome | 127 files／612 tests、93-page build、132 browser tests；Orders 1 + lock 2 staging tests、fixture cleanup 0；Knowledge Base／Visit／Meeting 實機無 app error；graph 442 files／3,754 nodes／7,730 edges |

## 5. Active TODO

### WP-10 OpenAI Real Acceptance `[!]`

Preparation 已完成：Agent chat、Structured JSON、Embedding、TTS／STT、Realtime client secret、usage persistence／cleanup，以及 acceptance-specific cost gate。

- [ ] 取得安全 `OPENAI_API_KEY`，執行前重驗官方模型價格。
- [ ] 設定 `OPENAI_ACCEPTANCE=1`、`OPENAI_ACCEPTANCE_MAX_USD=0.05`，執行 `npm run acceptance:openai`。
- [ ] 證明文字／JSON／向量／媒體／短效 token 與 `ai_usage_logs`；確認 cleanup 無殘留。

### WP-11 Knowledge Base journey `[!]`

Preparation 已完成：crawl／import／draft／publish／discard／search／reindex／recheck contracts，以及 provider-disabled Chrome journey。

- [?] 決定 embedding 失敗 recovery：保留舊 chunks、標記 unavailable，或明確要求 reindex。目前 `indexDocs` 先刪舊 chunks 再 embedding，不能擅改語意。
- [ ] 以自有、無個資的單頁 URL 跑 Firecrawl → draft → review → publish → search。
- [ ] 以 fixture ID 精確清除 `kb_sources`、`knowledge_base`、`kb_chunks`，記錄 Firecrawl／OpenAI 成本。

### WP-12 Visit AI journey `[!]`

- [ ] 用合成名片驗 parse-card／structured output／usage。
- [ ] 驗 draft-email 與 Contact Research profile persistence；不在此包寄 Gmail／LINE。
- [ ] 在 `/agents/visit` 完成受控 action journey 與 cleanup。

### WP-13 Visit delivery／recovery `[?][!]`

已完成：LINE signature／channel contracts、approval／offer／public respond／timeout 狀態契約、Google MIME／Calendar create mapping、atomic lock、所有 terminal lock cleanup。

- [?] 決定 Calendar 已建立、Gmail 或後續 DB／LINE 失敗時的 durable state 與人工補救。現況會有 `calendar_event_id` 但 invite 可能被標 `failed`，重送又被既有 event 擋下。
- [?] 決定 timeout 已寫 `timed_out` 後，tag／activity／LINE 部分失敗是否重播及如何避免重複通知。
- [ ] 有 Google + LINE credentials、allowlisted recipient 後，跑 inbound → approval → public respond → Calendar／Gmail／LINE staging journey。

### WP-14 Google reads `[!]`

OAuth、Calendar、GA4、GSC 的 config failure、refresh、query mapping、empty／error fallback contracts 已完成。

- [ ] 以測試 Calendar、GA4 property、GSC site 驗真實 read、permission、quota、token expiry與後台呈現。

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

本地 CI、scheduled workflows、Playwright diagnostics 已存在；`origin` 目前無法確認 canonical remote，scheduled URLs 指向 `https://kva.zeabur.app` 但部署真相未知。

- [ ] 恢復／確認 canonical GitHub repo、權限、branch policy；不 force-push。
- [ ] 驗 locked install、lint、typecheck、unit、build、browser smoke、artifact與 flaky 分類。
- [ ] 指定 scheduled failure 通知目的地／owner。
- [ ] 明確 deploy command、migration ordering、health check、promotion、app／secret／migration rollback與 release owner。

### WP-22 Final cleanup／handoff `[ ]`

- [ ] Provider journeys 與已選 reliability decisions 達標；未執行項有接受理由。
- [ ] 移除最後 dead code、過渡 re-export／flag、過期 tests、demo fallback 誤用與未接 composition。
- [ ] 全量 verify、CodeGraph、關鍵 UI／API／provider matrix、staging cutover／rollback rehearsal。
- [ ] 只把穩定操作知識補進 README／runbook，不新增重複架構文件。

## 6. 你回來後要取得的 credentials／資產

Secrets 只放 Git ignored `.env.local` 或正式 secret store；不要貼進 Git、TODO、測試 fixture或聊天回報。

| 優先 | Service | 需要取得／設定 | 同時要準備的安全資產 | 解鎖 |
|---|---|---|---|---|
| 1 | OpenAI | `OPENAI_API_KEY`；接受單次 US$0.05 成本 | 無個資 synthetic fixture | WP-10，並解鎖 WP-11／12／17 AI |
| 2 | Firecrawl | `FIRECRAWL_API_KEY`；`FIRECRAWL_API_BASE` 通常留空 | 自有公開單頁 URL、低頁數上限 | WP-11 crawl |
| 3 | Google OAuth | `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`GOOGLE_REFRESH_TOKEN` | 測試 Calendar、allowlisted email；OAuth scopes 含 Calendar write／Gmail send | WP-13／14 |
| 4 | Google analytics | `GA4_PROPERTY_ID`、`GSC_SITE_URL`；必要時 `GOOGLE_ADDITIONAL_CALENDAR_IDS` | 可讀測試 property／site／shared calendar | WP-14／17 |
| 5 | LINE primary | `LINE_CHANNEL_ID`、`LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN` | staging `line_agents.target_user_id` 指向明確測試 user | WP-13／15／16／17 |
| 6 | LINE support | `LINE_SUPPORT_CHANNEL_ID`、`LINE_SUPPORT_CHANNEL_SECRET`、`LINE_SUPPORT_CHANNEL_ACCESS_TOKEN` | support 測試 user／channel，不與 primary 混用 | WP-15／18 |
| 7 | Teachify | `TEACHIFY_WEBHOOK_SECRET` | sandbox／去識別 order event、可重播 event ID | WP-16 |
| 8 | Cron／Support | `CRON_SECRET`、`SUPPORT_LOG_SECRET`、`SUPPORT_RELAY_TARGET_URL` | safe relay endpoint、通知 owner | WP-17／18／21 |
| 9 | GitHub／Zeabur | canonical repo access、deploy project、secret owner | staging／production URL、health check、rollback owner | WP-21／22 |

Main `kv-staging` 的 Supabase env 已設定；Orders 與 conversation lock integration 已可重跑，不需再建立本地業務 DB。

## 7. 執行順序

1. 先拿 OpenAI key，跑最窄的付費 acceptance。
2. Firecrawl + OpenAI 完成 KB 單頁 journey與 cleanup。
3. Google read-only；再用 allowlisted email 做 Calendar／Gmail write。
4. LINE primary、support 分開驗；再接 Visit、Orders、Reporting、Support composite journeys。
5. Teachify sandbox event；先確認 replay產品決策。
6. 只依真實故障做 WP-20；接著恢復 remote、驗 CI／deploy／rollback。
7. WP-22 final cleanup、矩陣驗收與交接。

每個 slice 都要：CodeGraph 找 owner／consumer → 固定不變契約 → 完成同批程式碼 → focused tests → affected Chrome journey → heavy verify → 精確 cleanup → coherent commit。本來沒有 UI 的 API 才能以 API evidence 取代 Chrome；低等級 mock 不得冒充 provider／staging 完成。

## 8. Readiness verdict

- Healthy enough：架構方向、Main／Teaching DB、核心 domain ownership、本地驗證、Orders staging、atomic conversation lock、provider-disabled behavior都可繼續承接需求。
- Actually blocked：外部 provider credentials／safe recipients、三個產品 recovery 決策、canonical GitHub／Zeabur deploy與 rollback truth。
- Safe work now：目前列出的無 key 改動已做完；再繼續機械搬檔會降低品質。新需求仍可沿現有 owner 並行開發。
- 下一步：照第 6 節取得 credentials／資產，依第 7 節逐個做真實 acceptance；不要一次開所有 side effects。

## 9. 文件政策

- 只保留本文件的 current truth、active TODO、blocker、key matrix與 readiness；完成細節壓成 outcome ledger。
- CodeGraph、source、tests、Git、staging query與 Chrome 保存執行證據；本文件不複製流水帳。
- 每次 meaningful drift 更新狀態並刪除過期敘述，不讓 TODO 再膨脹成歷史報告。
