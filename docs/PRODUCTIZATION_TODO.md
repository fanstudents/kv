# KV 產品化控制清單

> 這是唯一的產品化 TODO、現況索引與 readiness 判定。Git 保存歷史，不另建 TODO v2、重構日誌或重複 architecture 文件。

## 1. 目標、邊界與完成條件

目標：在原 repository 內漸進整理 KV，使工程團隊能理解、驗證、修改、部署與擴充；既有 UI／UX、API、資料格式與外部 side effects 除非另有產品需求，全部保持不變。

狀態：`Active`｜Repo：`F:/ownproject/kv`｜Branch：`codex/kv-wp0-toolchain`｜環境：Main `kv-staging` + 獨立唯讀 Teaching DB｜判定：`Modular monolith ready for scoped KV delivery; transitional seams remain; not SaaS-ready`

### 換機接續 checkpoint（2026-08-15）

- Last code snapshot：`fecd8d3`（將 canonical baseline migration 檔名對齊 `kv-staging` 實際 history；SQL 內容未變）。CodeGraph 為 483 files／4,222 nodes／10,620 edges，無 pending drift。
- 本文件 revision 的輸入 snapshot：`1e85bb4`；本批進入 P8，補齊 commit／schema／environment deployment identity、Supabase project allowlist、migration plan/apply gates 與 remote promotion verification，不改 UI、資料 schema 或 provider side effects。
- Supabase Chrome evidence：已核對 `kv-staging`（ref `gizswqvyavkfrtndfzsb`、Healthy），Migration history 六筆與 repo 完全一致；最新 migration 是 `20260814164718_visit_offer_timeout_recovery`。Scheduled backup 頁面顯示每日 backup，最近一筆為 2026-08-14 17:23:38 UTC。
- 連線限制：Supabase Connect UI 只顯示含 `[YOUR-PASSWORD]` 的 placeholder，不會回傳資料庫密碼；未重設密碼、未把 secret 寫入 Git。CLI linked session 可安全完成 history／dry-run／no-op apply 驗證。
- Remote：`origin` 仍是已無法解析的 `cablate/kv`；可用的作者 repo 已登記為 `upstream = https://github.com/fanstudents/kv.git`。作者 `main` 截至 `d958a0b`，相對共同基底有 13 個 commits，尚未合併。
- 新電腦先讀：本文件 → `AGENTS.md`／`CLAUDE.md` → `README.md` → `.env.example`；不要重做全 repo 掃描或再建平行 TODO。
- 恢復順序：clone `fanstudents/kv` → switch `codex/kv-wp0-toolchain` → `npm ci` → 以安全管道重建 `.env.local` → `npm run verify`。`.env.local` 被 Git 忽略，必須另用 password manager／secret store 轉移，絕對不要 commit。

### 執行計畫身份與 GORE（2026-08-15）

- **Profile：** Master；這份文件同時管理產品範圍、架構收斂、真實旅程、部署與交接，不另建第二份計畫。
- **完整計畫 readiness：** `Needs Revision`。九月底產品範圍已決定為現有 KV 功能全部納入；尚未關閉的是 P3 部分 recovery 語意、P5 外部 ownership，以及 P1／部署 release gate。W1 可變流程 proof 已完成，結論是保留 explicit use case、W2 deferred。
- **架構交付狀態：** `Modular monolith ready for scoped KV delivery; transitional seams remain; not SaaS-ready`。這是目前可交付範圍的判定，不等於完整產品化計畫已 Ready。

| Actor／consumer | Job／outcome | Product intent／why now |
|---|---|---|
| 工程團隊 | 在不複製客戶專案的前提下維護、驗證、擴充與部署 KV | 讓 Dennis 的 vibe-coded 原作可長期承接需求，而不是每次再拆一輪或另寫一套 |
| 產品 owner／導入者 | 決定 9 月底要賣的能力組合、允許的外部副作用與 release owner | 先交付固定且可驗收的企業導入／內訓能力，不把未知需求提前做成平台 |
| 企業操作人員 | 使用原有後台與事件入口完成 Visit、Orders、Support、KB 等工作 | UI／UX 不變，但故障、空資料與真實 provider 狀態要能被信任 |

| Goal ID | Type | Goal | Observable outcome | 對應工作 |
|---|---|---|---|---|
| G-01 | Primary | 以固定能力包安全交付 KV | 選定的真實 journey 可在隔離 staging 重跑、留下 DB／provider／UI 證據並可交接 | P0、P5、P6、P8、P9 |
| G-02 | Supporting | 每個變更有清楚 domain owner、錯誤語意與 side-effect 邊界 | 新需求可由 CodeGraph 定位到 owner；失敗不被空結果或 demo fallback 藏掉 | P1、P4、P7 |
| G-03 | Enabling | 用最小實驗證明「可變流程」需要哪一層抽象 | 至少一個真實變化可不複製 route／module；沒有第二 consumer 就明確停止抽象 | W1；必要時 W2／W3 deferred |
| G-04 | Enabling | 安裝、版本、migration、排程與 rollback 可重現 | 另一位工程師可依同一 commit 完成 staging deploy 與回退 | P8、P9 |

**品質護欄：** UI／UX、既有 API JSON、Main／Teaching 資料 ownership 與 provider side-effect 順序預設不變；每個新增抽象必須有至少兩個真實 consumer，或有 provider translation、transaction、concurrency、recovery 的明確理由；每個 runtime change 都要有 focused tests、完整 verify 與受影響 Chrome evidence。

**不變條件與非目標：** Agent role、event、workflow、provider 是四個不同概念；`modules/agents/identity.ts` 目前只是 `legacy-static-registry` 相容接縫，不是可動態編排的 runtime。現在不做 generic workflow engine／registry／JSON DSL／plugin marketplace／低碼編輯器／multi-tenant SaaS，也不另開空白專案重寫。

**Goal trace：** G-01 → P0／P5／P6／P8／P9；G-02 → P1／P4／P7；G-03 → W1；G-04 → P8／P9。若 W1 結論改變 workflow owner、資料模型或 release strategy，先修回本文件，再進入下游 package。

**證據標籤：** `[Requirement]` 是使用者／產品要求；`[Fact]` 是目前 repo、runtime、測試或設定已驗證的事實；`[Decision]` 是已選方案；`[Inference]` 是由多個事實推導；`[Assumption]` 是可回退的暫定值；`[Unknown]` 是必須由 decision、spike 或 preflight 關閉的未知。`[x]` 代表 evidence 已存在，`[~]` 代表部分完成，`[!]` 代表外部／release gate，`[?]` 代表尚未決定。

| ID | Type | Requirement／invariant／non-goal | 由哪個工作證明 |
|---|---|---|---|
| R-01 | Requirement | UI／UX、既有 API JSON、Main／Teaching data ownership 與 provider side-effect 順序預設不變 | P1、P6、P7、P9 |
| R-02 | Requirement | 選定的真實 journey 必須留下 provider receipt、DB diff、Chrome、cleanup 與 owner sign-off | P2、P6、P8 |
| R-03 | Requirement | 可變流程先由既有 domain owner／typed config 表達；只有證據成立才升級抽象 | W1、P7 |
| I-01 | Invariant | 不複製 route／domain module；不新增只有單 caller 的儀式層 | W1、P7 |
| I-02 | Invariant | Agent role、event、workflow、provider 分開建模；`identity.ts` compatibility seam 不得冒充 runtime | W1、P6 |
| NG-01 | Non-goal | 現在不做 generic workflow engine／registry／JSON DSL／plugin marketplace／低碼 UI | W1；W2／W3 只有觸發才重開 |
| NG-02 | Non-goal | 現在不做 multi-tenant SaaS、全 repo rewrite、UI redesign 或把 Teaching DB 併入 Main | 全部 work packages |

### KV 推廣與模組化要求（2026-08-13）

- [Fact] Dennis 預計 9 月底開始推廣 KV；實際推廣版本範圍與必須通過的旅程尚未確認。
- [Requirement] KV 的能力需要整理成模組；目前仍有部分糾纏，應沿既有 domain／adapter boundary 漸進收斂，不一次建立未知需求的通用平台。

完成產品化必須同時成立：

- [ ] 目前仍在使用的核心旅程有可重複的 staging／sandbox 功能證據，不只 mock 或 render smoke。
- [x] Main migration 可 clean replay、generated types 可重現；Teaching DB 保持獨立唯讀來源。
- [~] 核心 domain owner 與 provider boundary 已建立；剩餘 legacy 只在真實需求／故障證據下 touch-and-migrate。
- [~] 外部 provider 的設定、成本、錯誤與 side-effect gate 已準備；真實 key／recipient 驗收尚未完成。
- [x] 本地 lint、typecheck、unit／contract、production build 與 browser smoke 可重複執行。
- [~] Repo 內 CI、release preflight、migration ordering、health/version 與 rollback procedure 已可重複執行；canonical hosted deploy／實際 staging promotion 仍待 owner。
- [ ] product-specific partial failure／retry／replay 決策已確認並驗證。
- [x] W1 已以 Visit `requireApproval` 變化完成 proof：同一個 explicit use case 同時覆蓋人工核准草稿與直接寄送；結論是保留 domain-owned workflow，不建立 registry／engine。W2 僅在第二個獨立 consumer 或明確產品需求出現時重開。
- [~] 無價值薄包裝持續收斂；保留的 port／adapter 必須有 provider translation、多 consumer、transaction、concurrency 或 recovery 理由。

### P1 安裝與運維基礎（2026-08-14，進行中）

- [x] `npm run doctor`：以 `demo`／`staging`／`live` profile 檢查環境變數、Main migration inventory 與 server-write key；staging／live 僅有 anon key 時明確 blocked，demo 仍允許 read-only；只顯示缺少的變數名稱，不呼叫外部服務。
- [x] `/api/version`：回傳 service、package version、commit、schema version 與 runtime environment；不回傳 secrets。
- [x] `/api/health`：回傳 Main Supabase 設定、server-side write readiness 與 release deployment identity；staging／live 缺 commit 或 schema identity 時回 503/degraded；不執行 DB/provider side effect。
- [x] CI 執行 `npm run verify:config`，確保 doctor command 在乾淨環境可執行。
- [x] CI 執行 local migration replay 與 generated-type drift check（schema job 已納入 `.github/workflows/ci.yml`）。
- [x] 已審核各 provider acceptance 的既有護欄：每條有明確 opt-in、recipient／host allowlist、唯一 marker、owned snapshot／restore 與精確 cleanup；目前不新增 generic acceptance framework。
- [~] Repo 內 health/version、migration promotion、application rollback／DB forward-fix procedure 已固定；仍需確認 canonical deploy、backup／restore evidence 與 release owner。

### P2 Ownership／overdesign 收斂（2026-08-14，本輪 evidence boundary 已完成）

範圍先限於 Knowledge Base；不改 UI、API payload、Main schema 或 provider side effects。

- [x] 以 CodeGraph 確認 KB route → domain module → Supabase composition → `src/lib` legacy store 的 caller／測試範圍。
- [x] 將無狀態的 per-request forwarding factory 收斂為三個穩定 port objects；保留單一 transitional composition boundary。
- [x] 明確標註 `src/adapters/knowledge-base/supabase-knowledge-adapters.ts` 仍有 transitional `src/lib/kb-*`／context 組合，尚未宣稱 strict hexagonal。
- [x] `knowledge_base`／`knowledge_access` 的 row mapping、CRUD、access persistence 已移到 `src/adapters/knowledge-base/supabase-knowledge-store.ts`；API payload、UI、schema 與 side-effect 順序不變。
- [x] `indexDocs`／`indexStats` 已移到 `src/adapters/knowledge-base/supabase-knowledge-index.ts`；embedding、Main Supabase 與 atomic RPC 的 ownership 不再藏在 `src/lib/kb-search.ts`。
- [x] Agent context 的 `knowledge_access` max-level read 與 `kb_citations` best-effort audit write 已移到 `supabase-knowledge-store.ts`；`src/lib/knowledge-base.ts` 現在只組裝 context。
- [x] Firecrawl URL／site journey 的 `kb_sources` lookup、check-in、refresh、create、failure、recheck-list 已移到 `supabase-knowledge-source-store.ts`；PDF source persistence 明確標為 transitional。
- [ ] 下一個真實 KB journey 觸碰時，才把 `src/lib/knowledge-base.ts` 的 context 與 `kb-import.ts` 的 ingestion ownership 往 domain slice touch-and-migrate；不得先做全 repo 搬檔。
- [x] 已完成其他薄層的 caller evidence review：checklist 是穩定 DB port object；live-task 有 3 個 API consumers；TV 同時組合 Google／Main DB；AI usage 包含 budget 語意；meeting adapters 分隔 demo/live context 與 usage。沒有符合安全合併條件的候選，因此不再機械式搬遷。
- **P2 停線規則：** PDF／context 與其他 transitional islands 只有在真實 journey、第二 consumer、provider translation、transaction、concurrency 或 recovery 需求出現時才再動。

#### P2-3 change contract：Knowledge index ownership

- **範圍：** 只移動 `indexDocs`／`indexStats` 的 implementation owner，並把 provider／DB 失敗明確化；保留 `/api/knowledge-base/reindex`、發布／編輯自動重建索引、`replace_kb_chunks` atomic RPC、embedding 維度與成功回傳行為。
- **入口與 consumer：** `supabaseKnowledgeIndexRepository`、`supabase-knowledge-store` 的 publish/update side effect、`kb-search` 的 query search；成功 API JSON、頁面文案、資料表與 UI 不變，失敗改以結構化非 2xx 回報。
- **不變條件：** 空 doc id 不呼叫 DB/provider；草稿／封存會以空 chunks 清除舊索引；embedding／RPC 失敗不清空上一版，並以結構化非 2xx 回應呈現；成功時 index stats 仍回 `{ chunks, docs }`。
- **驗收證據：** focused KB contracts（含 source-store 28 tests）、當時完整 test suite、lint/typecheck/build、CodeGraph up-to-date、Chrome `/knowledge-base` 與 `/goals`；本批另以 Chrome 點擊「重建索引」驗證成功 envelope。
- **非目標：** 不搬 `searchKnowledge`／`formatHits`、`knowledgeContext`、PDF／Firecrawl ingestion；不新增 generic search／workflow framework。

#### P2-4 change contract：Context persistence boundary

- **範圍：** 只移動 Agent max-level read 與 citation audit write 的 Supabase implementation；保留 `knowledgeContext` 的檢索、目錄、權限過濾、引用截斷與 best-effort 語意。
- **入口與 consumer：** `src/lib/knowledge-base.ts#knowledgeContext` 與 `src/lib/meeting-context.ts`；不改 Agent prompt 文案、API JSON 或資料表。
- **不變條件：** 沒有 `knowledge_access` row 時仍預設 L1；max-level 查詢錯誤仍 fail-closed；citation insert 失敗不阻斷回答。
- **驗收證據：** `tests/unit/knowledge-base-store.test.ts` 的 access／citation contracts、meeting context regression、完整 test/lint/typecheck/build、Chrome `/knowledge-base` 與 `/goals`。
- **非目標：** 不改 `searchKnowledge`／`formatHits`、PDF／Firecrawl ingestion、prompt 內容或資料 migration。

#### P2-5 change contract：Firecrawl URL source persistence

- **範圍：** 只移動 Firecrawl URL／site import 與 recheck 共用的 `kb_sources` lookup、check-in、refresh、create、failure、recheck-list persistence；PDF source persistence 暫留 `kb-import.ts`。
- **入口與 consumer：** `src/lib/kb-crawl.ts#importUrl`、`recheckUrlSources`；保留 Firecrawl HTTP／quota／retry 在 `firecrawl-client.ts`，保留候選條目 ingestion 在 `kb-import.ts`。
- **不變條件：** URL normalization／checksum、unchanged check-in、content hash refresh、source status transitions、recheck checked／changed 統計與既有錯誤訊息不變。
- **驗收證據：** baseline `kb-crawl-direct` 24 tests；after focused crawl／source adapter 28 tests、當時完整 test suite、lint/typecheck/build、Chrome `/knowledge-base` 與 `/goals`。
- **非目標：** 不新增 generic source repository、workflow engine、PDF migration、UI/API/schema 變更；recheck 對 `knowledge_base` review mark 與 `line_agent_activity` audit 仍留在現有 workflow owner。

不做：另開空白專案重寫、全面 UI redesign、為未知未來建立通用 Agent runtime／workflow engine／registry／JSON DSL／plugin marketplace、無 migration 設計改資料格式、以檔案數或測試數當進度。

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
- `src/lib/**`：共用技術能力與待觸碰 legacy orchestration islands；不是新業務邏輯的預設落點。KB context／PDF source／shared ingestion 目前仍在這裡，需以真實 journey 觸碰時再收斂。
- `src/components/**`：既有 presentation；只有真實需求才局部整理。

Agent 是產品角色／執行設定；webhook、cron、postback 是事件；研究、邀約、報告、訂單才是 workflow。不要把三者混成通用 runtime。

### Workflow 擴充政策（本輪重新定調）

前面曾提出 `WorkflowDefinition + Registry + Binding` 的方向；本文件現在把它降級為**未來可能的選項**，不是目前要建立的架構。原因是現有 `identity.ts` 的 `WorkflowBinding`、`capabilityIds` 仍是空的 legacy compatibility model，真正的 Visit／Orders／Support 行為仍由 domain module 明確持有。現在直接做 registry 只會增加檔案、mapping 與測試，卻沒有第二個真實 consumer 可以證明它值得存在。

目前採用的最小路徑：

```text
事件（webhook／cron／postback）
  -> 現有 domain use case
  -> typed deployment config／local policy（只放安全可變參數）
  -> ports／provider adapters
  -> Main DB／外部 provider
```

- **可配置的是參數，不是任意程式流程：** 例如通知開關、需要人工核准、報告收件人、允許的 provider／recipient；使用既有 settings 與 Zod／型別驗證，不把任意 JSON 變成 DSL。
- **行為先留在 code-owned workflow：** Visit、Orders、Support 各自維持明確 use case；不同客戶若只是參數差異，不複製 route 或 module。
- **只有證據才抽象：** 出現第二個獨立 consumer、第二個客戶要選同一種變化，或同一故障／recovery 模式重複出現，才考慮抽出最小 typed policy／definition。
- **停止條件：** W1 若證明現有 explicit use case 已足夠，就停止，不建立 workflow registry；不要為了「未來可能有很多 Agent」預先做平台。

| 後續層級 | 觸發條件 | 可以做什麼 | 現在狀態 |
|---|---|---|---|
| W1 | 一個真實流程需要一個可變行為 | 在既有 domain owner 內做最小 typed config／policy proof | 本輪先做；不需新的外部 key |
| W2 | 至少兩個獨立 consumer 需要選擇／版本化同一行為 | 小型、code-owned、typed `WorkflowDefinition` registry | Deferred；由 W1 證據觸發 |
| W3 | 非工程人員需要不發版就編輯流程，且已有明確權限／audit／rollback 需求 | DB catalog／受限 DSL／管理 UI | Deferred；另立產品平台計畫 |

### 架構判定

- **整體骨架已就位**：entrypoint、domain owner、port／adapter、Main／Teaching DB ownership 已足以讓新需求沿既有邊界開發；不需要再做一輪全 repo 搬檔。
- **不是所有模組都同樣成熟**：OpenAI shared transport、Orders、Support 已有清楚 owner；Visit 已模組化但仍保留少量有界的 legacy translation；Knowledge Base 已把 Firecrawl HTTP／quota／retry、URL／site `kb_sources`、`knowledge_base`／`knowledge_access` persistence 與 embedding／atomic index 分責，但 context／PDF source／shared ingestion 仍是 transitional `src/lib` orchestration；Teachify 的真實簽章契約仍未由 sandbox event 證實；GA4／GSC／Google 已有 provider boundary。`/integrations` 的管理連結與 Agent 用途仍保留 localStorage demo，但連線 badge／計數已改讀 `/api/integrations/status` live truth。
- **下一階段是需求驅動的垂直切片，不是水平重構**：依 KV 已確認的功能需求與 journey，只整理該 journey 經過的 capability module、provider adapter、recovery 與驗收證據。沒有第二個真實 consumer 或共同故障模式，不抽通用框架。

| Boundary | 現況 | 後續原則 |
|---|---|---|
| OpenAI | shared client + domain adapters，真實 acceptance 已通過 | 保持現有邊界，不再抽象一層；各 composite journey 只補 domain evidence |
| Orders／Teachify | Orders workflow／repository／LINE delivery 已分離；staging 已加入 delivery claim ledger，真實 webhook 契約仍未證實 | 先用 claim ledger 防 exact replay／並行重送；取得 provider event／timestamp truth 後再決定 stale／out-of-order recovery |
| Visit／LINE／Google | use cases、ports、lock 已建立；少量 `legacy-*` compatibility seam 仍在 | 只隨真實 delivery journey touch-and-migrate |
| Knowledge Base／Firecrawl | 真實單頁 journey 已通過；`supabase-knowledge-store.ts` owner `knowledge_base`／`knowledge_access` persistence，`supabase-knowledge-index.ts` owner embedding／index write，`supabase-knowledge-source-store.ts` owner URL／site `kb_sources` state；`firecrawl-client.ts` owner HTTP／quota／retry，`kb-import.ts` 仍 owner PDF source／shared ingestion orchestration | 保持 provider／DB 故障與回滾邊界；下一個真實 KB slice 才收斂 PDF source／ingestion，不建 generic crawler platform |
| Reporting／GA4／GSC | provider query boundary 已有；部分 demo／fallback 尚未被真實資料取代 | 先用授權的 read-only property/site 驗輸入、空資料與 quota |
| Integrations UI | 卡片、管理連結、Agent 用途與自訂服務仍是本機 demo；內建服務 badge／計數已讀 live API | localStorage 只負責 presentation edits；不得覆寫或冒充 provider connectivity |
| Supabase | Main migration／typed client 可重建；Teaching 是獨立唯讀來源 | 固定使用我方 staging；不拿 Dennis production DB 當測試環境 |

| Domain | UI／entrypoint | Current owner | Data／provider | 下一個 gate |
|---|---|---|---|---|
| Auth／後台 | `/login`、dashboard layout、`api/auth/**` | `modules/auth` | session、Main DB | release smoke |
| Operations／Goals | `/dashboard`、`/goals`、`/todos` | `modules/operations`、`goals`、`checklist` | Main + Teaching read | feature-driven |
| Knowledge Base | `/knowledge-base/**`、KB APIs／cron | `modules/knowledge-base` + Supabase document/index/source stores + transitional context／PDF ingestion／Firecrawl composition | Main、Firecrawl、OpenAI | P2／WP-11 |
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
| KB ownership repair | `firecrawl-client.ts` + `kb-crawl.ts` + `supabase-knowledge-store.ts` + `supabase-knowledge-index.ts` + `supabase-knowledge-source-store.ts` + focused contracts | Firecrawl protocol／quota／retry、URL／site `kb_sources` persistence、`knowledge_base`／`knowledge_access` persistence、embedding／atomic index 與 workflow orchestration 分責；未新增 route-specific layer；PDF source／ingestion 仍標示 transitional |
| KB atomic index replacement | `replace_kb_chunks` migration + focused unit／Main staging rollback acceptance + Chrome（2026-08-14） | OpenAI／RPC 失敗保留上一版可搜尋 index；成功時整批 transaction replace；service-role-only，fixture cleanup 0，UI/UX 未改 |
| KB failure truth | `d71de3c` + KB focused contracts + Chrome `/knowledge-base` | embedding、資料庫查詢、atomic RPC、index stats 失敗不再回傳空陣列／`0,0` 假成功；reindex／publish 回結構化 503，Agent live context 帶明確不可用指示；成功 payload、UI、atomic rollback 不變 |
| Integrations live truth | `/integrations` + `integrationConnectionState` + Chrome（2026-08-14） | 原 UI/UX 下顯示 4 個 live connected：Teachify、Supabase、OpenAI、Firecrawl；Google／LINE／Meta 如實未連線，自訂 demo 不再冒充 connected |
| Google read real acceptance | `npm run acceptance:google:read` + Chrome `/integrations`（2026-08-14） | 專用 `KV Staging` OAuth client、Calendar／GA4／GSC production providers 4 tests passed；GA4 `524303407`、GSC `sc-domain:cablate.com` 可讀，Gmail／Calendar／GA4／GSC live connected；未建立行程或寄信 |
| Google write real acceptance | `npm run acceptance:google:write`（2026-08-14） | 唯一 allowlist `reahtuoo310109@gmail.com`；Calendar 建立／回讀／刪除與 Gmail send production providers 2 tests passed；測試行程已清除，測試信不可回收 |
| Visit delivery real acceptance | `npm run acceptance:visit:delivery` + Chrome public respond（2026-08-15） | Main synthetic invite → Visit application／adapters → Calendar／Gmail 與 phase checkpoint 通過；synthetic LINE user 故意不可投遞，`email_sent`＋failed partial activity 如實保留，Chrome location form → success page，console 0 error；Calendar、contact、invite、marker activity cleanup 皆確認 0 殘留，已寄 Gmail 不可回收 |
| Visit timeout recovery | `visit_offer_timeout_recovery` migration + timeout application／adapter contracts + focused recovery tests（2026-08-15） | 舊 `declined` status vocabulary 不變；逾時以 `timeout_phase`／`timeout_error` 記錄，cron 可從 `activity_recorded` 續送 LINE，不重做已完成的 tag／activity；LINE 仍是 at-least-once，checkpoint 寫入失敗列入人工 reconciliation |
| GA4／GSC live projections | `tests/e2e/live-overview-projections.spec.ts` + Chrome Agent／TV（2026-08-14） | 4 browser contracts 通過；Demo 模式維持既有固定資料。如實模式 Agent／TV 顯示 GA4 83 sessions、GSC 26 clicks／508 impressions；區間切換取消舊請求，loading／empty／error 不退回假資料 |
| Overdesign cleanup | `b16512f` | KB adapters 三檔合一、forwarding tests 三檔合一、移除單 caller 轉送與 source-string tests；淨少 111 行 |
| KB provider-disabled UI | `f0dff54` + Chrome evidence | 缺 Firecrawl key 時頁面可理解失敗並恢復操作；UI 未改 |
| Atomic Agent run usage | `logStep` + `add_run_cost` + online staging acceptance | 20 次並行 usage 更新完整保留：60 tokens／US$0.20、20 steps；fixture cleanup 0 |
| Doctor write-readiness guard | `37322d5` + `tests/unit/doctor-script.test.ts`（2026-08-15） | staging／live 僅有 anon key 時明確 blocked；service-role 才算 server-side writes ready；demo profile 行為不變，且不輸出 secret；未改 UI／API／schema／provider side effects |
| Health readiness alignment | `9375a9a` + `tests/unit/runtime-ops.test.ts`（2026-08-15） | `/api/health` 與 Doctor 使用同一 server-side write 語意；anon-only 回 503/degraded，但保留 Main read configuration 狀態；service-role 回 200/ok；未呼叫外部服務 |
| Agent status live-read failure truth | `8c51955` + `tests/unit/agent-admin.test.ts` + `tests/unit/agent-admin-routes.test.ts`（2026-08-15） | `line_agents` live read failure 不再以 HTTP 200 偽裝成靜態成功；route 回 503 `{error:"Agent status unavailable"}`，成功時 `{enabled}` payload 完全不變；client 既有 fallback 保留，錯誤現在可診斷 |
| Live task history failure truth | `7e1ef0b` + `tests/unit/live-task-visit-history.test.ts` + `tests/unit/live-task-routes.test.ts`（2026-08-15） | Visit live history 的資料庫讀取失敗不再回 `{items:[]}` 偽裝成沒有歷史；route 回 503 `{error:"Live task history unavailable"}`，成功 response 與 TV UI 不變 |
| Visit research read failure truth | `a4a7091` + `tests/unit/supabase-visit-research.test.ts` + `tests/unit/visit-ai-routes.test.ts`（2026-08-15） | `contact_profiles` read failure 不再回 `{profiles:[]}` 偽裝成無歷史；GET route 回 503 `{error:"Visit research unavailable"}`，成功 response 與 Visit UI 不變 |
| Live task state/image read failure truth | `a4a7091` + `tests/unit/live-task-store.test.ts` + `tests/unit/live-task-routes.test.ts`（2026-08-15） | `agent_live_task` state/image read failure 不再回 inactive/404 偽裝成無任務；state/image routes 回 503 generic client-safe errors，成功 payload／TV UI 不變 |
| Guarded release gates | `5e67430` + `1e85bb4` + `tests/unit/release-script.test.ts` + `tests/unit/runtime-ops.test.ts`（2026-08-15） | release preflight 綁定 clean commit、latest migration、runtime profile 與 Doctor；migration plan 先比對 history／dry-run，apply 另需 project ref、backup confirmation、explicit apply gate；remote promotion 必須通過 commit／schema／environment／health 比對；Windows 實測改用 pinned Supabase CLI，避免 `npx.cmd` EINVAL |
| Current verification | `verify:config`、focused contracts、`npm test`、lint/typecheck/build、CodeGraph、Playwright smoke | `verify:config` 通過並只顯示缺少變數名稱；138 files／717 tests、93-page build、147-test hermetic browser smoke；release preflight 已在 final clean `84c4a48` 成功產生 6-migration manifest，migration plan 在缺 `SUPABASE_DB_URL` 時安全停止；本機無 Docker／Podman，因此本批 local schema replay deferred，既有 hosted CI schema job仍是 canonical replay gate；未改 UI／schema／provider side effects；2026-08-15 CodeGraph 483 files／4,222 nodes／10,620 edges，無 pending drift |
| Google partial calendar truth | `b0376b7` + `google-read-direct` + Chrome `/agents/schedule` | 共享日曆讀取失敗不再靜默變成空行程；既有 warnings 區塊會指出哪個 calendar 未納入；正常 Google 行程、API payload、UI 結構與任何寫入不變 |
| Primary composite acceptance | `npm run acceptance:primary:composites` + Main cleanup query + Chrome（2026-08-14） | Broadcast、Orders、Team Lead 依序完成 Main／OpenAI／Primary LINE；兩次各 3 則 allowlisted staging 訊息，第二次驗證 ID-diff cleanup；orders、broadcast logs、activities、subscriber tags、暫存 recipients 全數 0／還原 |
| Teachify delivery claim slice | `20260814153820_teachify_order_delivery_claim` + focused Orders contracts + remote claim probe（2026-08-14） | `teachify_order_deliveries` 以 `(order_id,event_key)` claim exact replay；`claimed`／`in_progress`／`delivery_complete` 與 LINE delivery failure／delivered-but-unrecorded contracts 通過；staging probe 三態驗證後 fixture 0 殘留。尚未宣稱 Teachify provider truth、stale 或 out-of-order 已完成 |
| LINE webhook payload guard | `parseVisitLineWebhookPayload`／`parseSupportRelayPayload` + 28 focused contracts（2026-08-15） | `events` 非陣列會在 route dispatch 前被拒絕；陣列中的 null／primitive 不會進入 application `.map`；正常空 payload 與既有 signature／relay contract 保持不變。未改 UI 或 provider side-effect policy |
| W1 Visit workflow variation proof | `tests/unit/visit-line-offer-application.test.ts`（2026-08-15） | 同一個 Visit explicit use case 以既有 `requireApproval` 設定覆蓋「先產生草稿」與「直接寄送」兩條行為；輸出、寄信、回覆、run telemetry 與 lock release 均有 focused contract。沒有新增 registry／wrapper／schema／provider key；W2 deferred |
| P0 September scope decision | 本 TODO 產品決策（2026-08-15） | 九月底不刪減現有 KV 功能；既有 Agent／Visit／Orders／KB／Support／Meeting／Reporting／Operations／Subscribers／Live Task／TV／integrations 全部納入，未驗證 provider 與部署責任仍列為 release gate |
| P6 available-provider recheck | `acceptance:openai`、`acceptance:kb`、`acceptance:google:read`（2026-08-15） | OpenAI 1/1、Knowledge Base／Firecrawl 1/1、Google read 4/4 通過；Primary composite 因 `PRIMARY_COMPOSITE_ACCEPTANCE` 未開啟而安全停止，3 tests skipped，沒有發送 LINE 或留下 fixture |
| P6 staging browser read-path recheck | `npm run test:e2e:run:staging`（2026-08-15） | 136/136 通過：API anonymous guards、login、所有 protected／public pages、live projection contracts；沒有 assertion failure，未執行 provider write |
| Goals functional browser contract | `tests/e2e/goals-functional.spec.ts` + focused／full Playwright Chromium（2026-08-15） | 3/3 通過：建立目標保留 PUT payload、儲存失敗回滾 optimistic card、DELETE 確認後移除卡片；API 以 route interception 驗證，沒有外部寫入；UI／API／schema 未改 |
| Agent settings functional browser contract | `tests/e2e/agent-settings-functional.spec.ts` + focused／full Playwright Chromium（2026-08-15） | 2/2 通過：Orders 後台設定保留既有 PATCH payload、啟用切換遭 API 503 時回復原狀；共用 `AgentPageShell` UI／API／schema 未改，沒有外部寫入 |
| Checklist functional browser contract | `tests/e2e/checklist-functional.spec.ts` + focused／full Playwright Chromium（2026-08-15） | 2/2 通過：待辦勾選保留 PATCH payload、持久化失敗回復未完成狀態；API 以 route interception 驗證，沒有外部寫入；UI／schema 未改 |
| Subscribers／Broadcast functional browser contract | `tests/e2e/subscribers-functional.spec.ts` + focused／full Playwright Chromium（2026-08-15） | 2/2 通過：標籤編輯保留更新 payload、推播保留 audience/style/text payload 並顯示 provider 結果；API 以 route interception 驗證，沒有 LINE 外部寫入；UI／schema 未改 |
| Meeting boundary functional browser contract | `9b773d0`、`tests/e2e/meeting-boundary-functional.spec.ts` + focused／full Playwright Chromium（2026-08-15） | 2/2 通過：start API 失敗不進入 phantom LIVE；鏡頭／麥克風拒絕時顯示明確恢復訊息，並以既有 finish API 封存已建立的空會議；API 以 route interception、media permission 以 browser stub 驗證，沒有 OpenAI／WebRTC／provider 寫入；UI／schema 未改 |
| Agent admin live-error truth | `agent-page-state` contracts + shared `AgentPageShell`／`RealStatusPanel`／`agent-status` changes（2026-08-15） | 既有版面與 API 不變；demo 模式保留展示 fallback；live 模式設定／活動／真實狀態讀取失敗會留下可見 failed activity／狀態錯誤，空陣列不再被補成靜態執行紀錄；PATCH 失敗會回復 toggle、儲存按鈕不再誤顯示成功 |
| Agent integration projection truth | `6e7e204` + `integration-status-projection`／Agent page contracts + Chrome `/agents/today`（2026-08-15） | `RealStatusPanel`／`ConnectionStatusList` 共用 live projection；載入中／讀取失敗不再把 `INTEGRATION_SEEDS` 的靜態 connected 當成連線證據；UI、API 與正常 live 結果不變 |
| Integration probe failure truth | `0d9261a` + `integration-status-projection` + Chrome `/integrations`、`/agents/today`（2026-08-15） | `/api/integrations/status` 非 2xx／格式錯誤會明確進入「查詢失敗」，不再永久停在「查詢中」或被誤判為未連線；正常 live 結果與 UI 結構不變 |
| Goal trend failure truth | `ebddc5f` + `goal-history`／goals route contracts + Chrome `/goals`（2026-08-15） | 趨勢 API 非 2xx／格式錯誤不再靜默變成「累積資料中」；會保留可診斷錯誤並顯示短狀態，正常空資料仍維持原本的「累積資料中」；目標卡與頁面版面不變 |

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
- [x] KB retrieval／index failure truth：embedding、`match_kb_chunks`、`replace_kb_chunks`、index stats 失敗不再被轉成空結果或 `0,0`；reindex／publish 以 503 回報，`meeting-context` 對 Agent 明示知識庫暫時不可用；成功 payload 與既有 UI 不變。

### WP-12 Visit AI journey `[x]`

Change contract：範圍只含 `parse-card`、`draft-email`、Contact Research 與其 Main DB／Chrome projection；不寄 Gmail／LINE、不改 UI。成功與失敗時 `research-search` step 都必須離開 `running`，run／profile／activity 必須與結果一致；AI usage 保留，synthetic fixture 精確清除。

- [x] 合成名片經真實 `gpt-4o` structured output 正確辨識姓名、公司、職稱、Email、電話，usage 已落 Main。
- [x] `gpt-4o-mini` 邀約信成功；虛構姓名／公司經 Web Search 回 empty、0 links／sources、10% confidence，沒有捏造公開資料。
- [x] Chrome `/agents/visit` 顯示相同 empty profile、無 app console error；清除後 profile／run／steps 都為 0，三筆 usage audit 保留。
- [x] 修正 research search step 只寫 `running` 的不一致；成功補 `done`、失敗補 `failed`，focused unit contract 與全量 verify 通過。
- [x] 補上 idempotent `line_agents` seed migration；我方 staging 已有 12 rows，activity insert／delete probe 通過。原先 activity 缺失是空父表造成，不是 provider 成功的證據。

### WP-13 Visit delivery／recovery `[~][!]`

已完成：LINE signature／channel contracts、approval／offer／public respond／timeout 狀態契約、Google MIME／Calendar create mapping、atomic lock、所有 terminal lock cleanup。

Delivery change contract：範圍只含既有 public respond 的 Main staging、Calendar、Gmail 與 activity 寫入，不改 UI／API payload、不使用 LINE 正式身份；唯一外寄對象為 `GOOGLE_WRITE_ACCEPTANCE_RECIPIENT`。Calendar／Gmail 核心成功必須持久化非空 `calendar_event_id` 與 phase checkpoint；LINE 未完成時保留 `email_sent`、記錄 failed partial activity，頁面仍告知外部聯絡人行程與信件已完成；有效 LINE 成功時才進入 `completed`／success activity。Main 寫入或 Google 未回傳 ID 必須 fail closed；Calendar／DB synthetic fixtures 必須精確清除，已寄 Gmail 不可回收。

- [x] Visit public respond 已以 additive migration `20260814162213_visit_invite_fulfilment_phase.sql` 補上 `pending_invites.fulfilment_phase`／`fulfilment_error`。Calendar、Gmail、LINE 每完成一段就留下 checkpoint；重送只補未完成的副作用，不重建已記錄的 Calendar，也不重寄已完成的 Gmail。舊的 confirmed＋既有 `calendar_event_id` 維持 already handled；舊 failed rows 可從既有 Calendar checkpoint 恢復。這是 at-least-once 邊界：若外部副作用成功但 checkpoint 寫入失敗，仍需人工 reconciliation，沒有宣稱 exactly-once。
- [x] Visit timeout recovery 已採 provider-specific phase：舊 `visit_offers.status=declined` 不變，新增 `timeout_phase`／`timeout_error`；tag 已是 read-before-write 的 idempotent operation，activity checkpoint 後才允許 LINE，LINE 失敗會保留 `activity_recorded` 讓下一輪只補通知；仍明確標示 at-least-once，外部成功但 checkpoint 寫入失敗需人工 reconciliation。
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
- [x] Calendar 多來源 read partial failure：共享日曆權限失效時保留可讀的其他行程，並在既有 warnings 顯示「哪個來源未納入」；不把空列表當成完整成功，也不新增 Google 寫入或額外 provider probe。

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
- [x] Visit／Support webhook parser 先驗證 `events` collection shape，避免 malformed payload 直接進入 dispatcher；provider-level retry／duplicate policy 仍保留在 P3／外部 gate。
- [x] Broadcast、Orders、Team Lead Reporting 已在 Primary LINE allowlist 完成 composite acceptance、DB diff、Chrome 與 cleanup；Support 仍依 WP-18 使用獨立身分驗收。

### WP-16 Teachify Orders `[~][!]`

signature、payload mapping、Orders repository 線上 staging、upsert、cleanup、DB fail-closed 已完成。

- [x] exact replay／並行重送先以 `teachify_order_deliveries` 的 `(order_id,event_key)` claim 防止重複 LINE；`claimed`、`in_progress`、`delivery_complete`、delivery failed 與 delivered-but-unrecorded 均有 focused contracts。fallback event key 是 normalized business-event fingerprint；不冒充官方 provider event ID。
- [?] 決定同 order 狀態更新是否再次通知，以及 stale／out-of-order event 的人工 recovery；需 provider event ID／timestamp 與產品決策。
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
- [x] Visit research 的必要 contact／recent-profile reads 已 fail-closed；profile list、failure compensation 與 activity 保留不阻塞已確認拜訪的 best-effort 契約，但 DB error 會留下明確 server diagnostic。
- [x] KB index replacement 已採 transaction 原子替換，provider／RPC 失敗不再清空可用索引；草稿／封存仍以空 replacement 清除既有 chunks，維持原產品契約。
- [x] Teachify exact replay／並行 claim 已按 provider-specific ledger 實作，不引入 generic retry／queue；stale／out-of-order 仍保留給 provider truth 與產品決策。
- [x] Visit public respond 與 timeout 多副作用 phase 已按 provider-specific contract 實作；不引入 generic retry／queue。Teachify stale／out-of-order 與 Support relay retry 仍需 provider truth／產品語意後處理。
- [x] Support relay 已為每個 raw webhook 建立穩定的 `body:<sha256>` delivery key，轉送時附上 `X-KV-Support-Relay-Key`，並將設定缺失、網路錯誤、逾時與非 2xx 回應分成可診斷的 failure kind；有效 webhook 仍回 200。這只建立 replay identity 與觀測契約，不假裝舊客服已支援 idempotency，也不在未取得 owner 契約前自動重送。

### WP-21 CI／deploy／rollback `[~]`

本地 CI、scheduled workflows、Playwright diagnostics 已存在；作者 repo 已確認為 `upstream/fanstudents/kv`，但 `origin` 已失效、canonical remote／branch policy 尚未定案。`https://kva.zeabur.app` 的 `/api/version` 於 2026-08-15 回 401，`/api/health` 雖回 HTTP 200，但 body 是 `degraded` 且 service／version／commit／schema／environment 全空；它明確不是本 branch 可驗證的 release target，只能判定 domain 存活，不得拿來做破壞性驗收或改 webhook。

- [ ] 恢復／確認 canonical GitHub repo、權限、branch policy；不 force-push。
- [~] 本 branch `npm run verify` 已通過 lint、typecheck、138 files／717 tests 與 93-page production build；既有 147-test hermetic browser smoke 與 136-test Main staging read matrix仍有效。release preflight 已在 clean `fecd8d3` 通過；locked install、hosted artifacts／flaky 分類仍待 canonical repo。
- [x] `.github/workflows/ci.yml` 支援 PR／main 與手動 dispatch，quality job 跑 install／config／lint／typecheck／unit／build／browser smoke，schema job clean replay migrations 並檢查 generated types。
- [x] `release:preflight` 綁定 Doctor、clean worktree、checked-out commit、latest migration 與 staging／live runtime identity；`/api/version` 暴露非敏感 commit／schema／environment，`/api/health` 對 release identity 缺失 fail-closed。
- [x] `release:migrations:plan` 先做 migration history compare 與 `db push --dry-run`；`release:migrations:apply` 要求 DB URL 命中 allowlisted project ref、backup 已確認、explicit apply gate 與相同 project confirmation。沒有 `SUPABASE_DB_URL` 時已證明安全停止，未碰遠端資料庫。
- [x] 以 Supabase linked session 對 `kv-staging` 完成實際外部驗證：`migration list --linked` 六筆 local／remote 全部相同；`db push --linked --dry-run --include-all` 與 `db push --linked --include-all --yes` 都回報 `upToDate`、沒有待套用 migration。這是 staging schema gate，不等同 app deploy／remote health／rollback 完成。
- [x] README 已固定 additive migration → exact commit deploy → remote verify → promotion 的順序；application rollback 與 DB forward-fix／PITR recovery 分開，明確禁止 remote `db reset`。
- [x] 對現有 `kva.zeabur.app` 跑 read-only `release:verify`，因 `/api/version` HTTP 401 安全停止；直接 health probe 顯示 degraded 且 deployment identity 全空，證明它不是本次 `84c4a48` 可 promotion 的 isolated staging。
- [ ] 指定 scheduled failure 通知目的地／owner。
- [!] 外部 release gate 尚未封口：若沿用 release CLI 的 explicit URL policy，仍需 release 專用 `SUPABASE_DB_URL`（UI 不提供密碼）、canonical GitHub／Zeabur staging owner、部署 exact commit、`release:verify` 與 application rollback rehearsal；staging DB migration 本身已驗證為 up-to-date。

### WP-22 Final cleanup／handoff `[~]`

- [~] Main／OpenAI／Firecrawl／Google／Primary LINE 與 Support Main 自主 journeys 已達標；Support LINE、Teachify provider truth、Visit inbound、hosted schedule／deploy 仍有明確外部 gate，replay decisions 仍依 P3。
- [x] `/integrations` badge／計數已改綁 `/api/integrations/status` live truth並維持原 UI/UX；localStorage 僅保留管理連結、Agent 用途與自訂服務 demo，自訂項無 live probe 時顯示未連線。
- [~] 本輪 CodeGraph 沒找到可安全刪除的無 caller 模組；Visit `legacy-*` adapters 仍被 webhook／cron 真實呼叫，保留為外部／舊 schema 邊界。最後 transitional cleanup 要等 P6 evidence，不為減檔名硬刪。
- [~] 全量 verify、CodeGraph、138-file／717-test contracts、8-page Chrome matrix、Main residue audit 與 147-test browser smoke 已完成；本批未改 UI，新增 release identity、migration target／apply guard 與 remote promotion contracts；staging cutover／rollback rehearsal 仍待 deploy ownership。
- [x] 穩定的安裝、verify、staging read-path 與 opt-in write/cleanup 邊界已補進 README；細節只由本 TODO 維護，不新增重複架構／runbook 文件。

## 6. 自主邊界與仍需外部取得的資產

Secrets 只放 Git ignored `.env.local` 或正式 secret store；不要貼進 Git、TODO、測試 fixture或聊天回報。

目前不需要再取得 Main Supabase、OpenAI、Firecrawl、Google 或 Primary LINE 才能繼續工程工作。`CRON_SECRET`、`SUPPORT_LOG_SECRET` 是我方內部 secret，可自行安全產生，不應算成外部 blocker。真正仍需外部提供的是 Support LINE、Teachify provider truth、safe relay、部署／canonical repo，以及產品決策；Main Supabase credentials 已設定，不列入待取得數量。

W1 bounded workflow proof 只使用既有 Main staging fixture、local provider doubles 與目前已存在的設定，不需要再拿新的外部 key；它的輸出是「是否值得抽出最小 policy」的決策，不是新的 runtime 平台。

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
P0 Scope（D） ───────────────────────────────────────────────┐
P1 驗收護欄（A） ──> P2 Primary composite（A） ─────────────┤
         ├──────────> P4 本地 provider readiness（G） ──────┤
         └──────────> W1 bounded workflow proof（A） ────────┤
P3 Recovery／replay decisions（D） ──────────────────────────┤
P5 外部 staging／ownership 資產（E） ────────────────────────┤
                                                               v
P6 真實 provider journeys（G+E） -> P7 證據驅動修復／收斂（A）
                                   -> P8 CI／deploy／rollback（E） -> P9 cleanup／交接
```

**DAG 讀法：** P1、P2、P4、W1 可以先用現有 fixture／staging 自主推進；P0、P3、P5 可平行整理但屬決策或外部 gate。P6 必須等 P0 的產品 scope、P3 的 recovery 語意、P4 的本地 contract、P5 的 credentials／ownership 與 W1 的抽象決策都明確；P7 只修 P6 真正暴露的問題，不能提前做水平大重構。

| ID | Outcome | Depends on | Produces | 可平行 | Serial owner／integration point |
|---|---|---|---|---|---|
| P0 | 9 月底現有功能全納入與驗收範圍定案 | 已記錄產品決策；仍需 owner 分派 | 每個既有能力的 journey、guardrail、release owner | P1、P4、W1、P5 | 產品 owner |
| P1 | 所有 side effect 都有測試護欄 | 現有 staging／env | allowlist、fixture、snapshot／restore、停止條件 | P0、P3、P4、P5 | 工程團隊 |
| P2 | Primary composite evidence 可重跑 | P1 | DB diff、provider receipt、Chrome、cleanup | P0、P3、P4、W1 | acceptance owner |
| P3 | Visit／Teachify／Support recovery 語意核准 | 現有 local contracts、provider input | retry／replay／stale／rollback decisions | P0、P1、P4、P5、W1 | 產品＋可靠性 owner |
| P4 | 本地 provider contract 與 failure map 完整 | P1 | local contract、fixture、未驗外部項清單 | P0、P3、P5、W1 | 各 domain owner |
| P5 | 外部 credentials／部署 ownership 可使用且可撤回 | 外部協作者與產品決策 | Support／Teachify／deploy 資產及 owner | P0、P1、P3、P4、W1 | release owner |
| W1 | 一個可變流程完成最小抽象判定 | P1 | keep explicit／extract policy／W2 deferred decision | P0、P3、P4、P5 | 該 domain owner |
| P6 | 真實 provider journeys 在隔離 staging 通過 | P0、P3、P4、P5、W1 | receipt、DB diff、UI、cleanup、owner sign-off | 無；同一環境 serial | release owner |
| P7 | 只修 P6 暴露的可靠性與 ownership 問題 | P6 | focused code／contracts、architecture decision | 不同 domain 可平行，整合需 serial | 工程整合 owner |
| P8 | deploy／migration／health／rollback 可重現 | P7、canonical repo owner | hosted CI、promotion、rollback runbook | 無；release serial | release owner |
| P9 | 乾淨交接與下一批入口完成 | P8 | clean worktree、證據索引、owner／risk handoff | 無 | engineering＋product owner |

### 7.4 Work packages 與退出條件

0. **P0 — Scope control（D，不阻塞 P1／P2／P4／W1）**
   - [~] 背景輸入：Dennis 預計 9 月底開始推廣，與互動簡報系統一起走企業合作／分潤；主要交付是企業導入或內訓專案，對象包含工場／製造／半導體背景，資訊業可先聚焦辦公室資安。這些背景已由下方產品決策轉成 release scope。
   - [x] **產品決策（2026-08-15）：九月底不刪減現有功能；目前 KV 已存在的功能面全部列入首發 scope。** 至少包含 Agent／Chat、Visit、Orders、Knowledge Base、Support、Meeting、Reporting、Goals／Checklist／Operations、Subscribers／Broadcast、Live Task／TV 與現有 integrations／後台頁面。
   - [x] 以上功能沿現有 domain owner 交付：① Visit／企業拜訪（名片→研究→邀約→Calendar／Gmail／LINE）；② Teachify／課程或電商訂單通知（webhook→Orders→Primary LINE）；③ Knowledge／客服內訓（知識庫→審核／搜尋→Support relay）；其餘既有頁面與能力維持 UI／API 相容並納入同一 release checklist。
   - [~] Scope 已定，但每個功能的 provider acceptance journey、部署 owner、品牌／合作分潤細節仍要補齊；未驗證的外部 provider 不得被寫成已上線，只能標示為 release gate。
   - [x] Scope 邊界同步確認：不把 upstream 尚未存在的候選功能、W2／W3 generic workflow runtime、multi-tenant SaaS 或 UI redesign 偷塞進九月底版本；既有 demo／sales projection 保留相容，但不當作 live provider truth。
   - 逐項裁決 upstream 候選：名片轉正、LINE 寄出／取消卡片、Firecrawl fallback、社群連結、劇院圖文／hold state；只把核准項目沿現有 Visit／KB owner 手工移植，不 merge 整包 upstream。
   - 品牌改名與 Super Agent 展示是產品／UI 需求，另立 change contract，不混入保持 UI 不變的結構整理。
   - **Exit**：現有每個能力都有對應 acceptance journey、guardrail 與 release owner；scope 不再用 accept／defer／reject 取捨，未完成的 provider／部署證據仍標為 release gate。

   **P0 功能驗收矩陣（以現況為準，不新增架構）：** 精確 API 入口以 `tests/fixtures/api-surfaces.ts` 為索引；domain owner／資料與 provider 由目前 `src/modules`、`src/adapters` 與既有 outcome ledger 對照。每列都要在 P6 留下 provider receipt、DB diff、Chrome evidence、cleanup 與 owner sign-off。

   | 功能面 | 目前入口／owner | 主要資料與 provider | 目前證據／下一個 gate |
   |---|---|---|---|
   | Auth／Runtime／Integrations | `/login`、`/api/auth/*`、`/api/health`、`/api/version`、`/api/integrations/status`；`modules/auth`、`proxy`／doctor | Main env、HMAC session、各 provider preflight | doctor、health/version、status contracts 已有；P8 需 canonical deploy／revision |
   | Agent／Chat | `/agents/*`、`/api/agent-chat`、`/api/agents/[slug]/*`；`modules/agents`、`modules/agent-chat` | Main、OpenAI、LINE test-push | OpenAI／後台 live-error evidence 已有；P6 補每個既有 Agent page 的關鍵操作矩陣 |
   | Visit | `/api/line/webhook`、`/api/agents/visit/*`、`/api/cron/visit-timeout`；`modules/visit`、Visit adapters／lock | Main、OpenAI、LINE、Google Calendar／Gmail | AI、public respond、delivery、timeout 已有；P6 補真實 LINE inbound／image／postback |
   | Orders／Teachify | `/api/webhooks/teachify-order`、`/api/agents/orders/test-notify`；`modules/orders`、Orders adapters | Main、Teachify、Primary LINE | claim／exact replay／Primary composite 已有；P5/P6 需真實簽章與可重播 event |
   | Knowledge Base | `/api/knowledge-base/*`、`/api/cron/kb-recheck`；`modules/knowledge-base`、KB adapters | Main、OpenAI embeddings、Firecrawl | crawl→draft→publish→index→search 已有；PDF/context transitional 只在真實需求觸碰時收斂 |
   | Support／Subscribers／Broadcast | `/api/line/webhook/support`、`/api/agents/support/*`、`/api/subscribers/*`、support cron；`modules/support`、`modules/subscribers` | Main、Support LINE、OpenAI、relay target | Support Main／Primary composite 已有；P5/P6 需獨立 Support LINE 與 relay owner |
   | Meeting／Realtime／Media | `/api/meeting/*`、`/meeting`；`modules/meeting`、Meeting adapters | Main、OpenAI realtime／TTS／STT、Google context | provider contracts／OpenAI acceptance 已有；P6 補完整 browser round／voice／finish journey |
   | Reporting／Operations | Team Lead／Support report routes、`/api/agents/operations/pipeline`、report cron；`modules/reporting`、`modules/operations` | Main、Teaching read-only、OpenAI、LINE | Primary Team Lead、Teaching read bridge 已有；P5/P8 補 hosted schedule owner |
   | Goals／Checklist | `/api/goals/*`、`/api/goals/history`、`/api/checklist*`、`/goals`；`modules/goals`、`modules/checklist` | Main Supabase | failure-truth／Chrome `/goals` 已有；P6 補完整 create／update／history／cleanup |
   | Live Task／TV／展示 projection | `/api/live-task*`、`/api/tv/idle`、`/tv`、`/universe`；`modules/live-task`、`modules/tv` | Main、Google read、demo projection | GA4／GSC live projection 與 browser evidence 已有；P6 確認 live／demo 標示與失敗語意 |
   | Public catalog／static surfaces | `/agents-catalog/**`、`public/*.html`；presentation／static assets | 無 durable provider truth | 136-test public smoke 已有；保持 UI，不把展示資料算成業務成功證據 |

1. **P1 — 驗收護欄（A，尚未封口）**
   - [x] 本地已產生並設定 Git ignored 的 `CRON_SECRET`、`SUPPORT_LOG_SECRET`；它們不是外部 blocker，也未寫入文件或 commit。
   - [x] 既有 opt-in acceptance 已分別具備 recipient／host allowlist、具名 marker fixture、資料／設定 snapshot／restore 與精確 cleanup；不得使用正式客戶 recipient。這些護欄維持各 provider 的窄契約，不另造 generic framework。
   - 固定每批流程：CodeGraph 找 owner／consumer → 固定契約 → 完成同批修改 → focused tests → affected Chrome journey → heavy verify → cleanup → coherent commit。
   - **Exit**：所有後續 side effect 都有 allowlist、前後 snapshot、cleanup 與失敗停止條件。

2. **P2 — Primary composite 驗收（A）**
   - [x] Broadcast：只建立一筆 Primary LINE allowlisted subscriber，驗 push／activity／count 後刪除 fixture。
   - [x] Orders：用去識別 fixture 經 application → Main DB → Primary LINE；暫時設定 `orders.settings.reportTo`，完成後原樣還原。Teachify provider signature 仍屬 P5／P6。
   - [x] Team Lead Reporting：用 Main + OpenAI + Primary LINE 驗共用 manual／cron runner；暫時設定 `teamlead.settings.reportTo` 後還原。
   - [x] `/subscribers`、`/agents/orders`、`/agents/teamlead` 改前／後與 cleanup 後皆以 Chrome 驗證；console 0 error，Orders fixture 曾被 Chrome 抓出後改用 ID 差集修正並二次驗收。
   - **Exit（已達成）：**三條 journey 的輸入、DB diff、LINE receipt、Chrome evidence、cleanup 成對存在；`npm run acceptance:primary:composites` 為可重跑入口。

**W1 — Bounded workflow extensibility proof（A，P1 後可執行）**

**Contribution：** G-03；驗證 R-03「可變行為先用既有 domain owner／typed config 表達，沒有證據就不抽平台」，並守住 I-01 UI／API／資料相容性。

- **目的：** 回答「未來不同企業要有些流程差異時，最小需要哪一層」；不是建立 workflow engine，也不是把 Agent 變成可任意編排的資料表。
- **範圍 anchors：** 先盤點 `modules/visit`、`modules/orders`、`modules/support` 的現有 use case、`line_agents.settings` 與 provider ports；可選一個不需要新外部 key 的真實變化，例如 Orders 通知開關或 Visit 人工核准開關。實際選項要以 CodeGraph caller／既有 contract 證據決定。
- **不變：** 不新增 `workflow-engine`／generic registry／JSON DSL／plugin marketplace；不複製 route／domain module；不改 UI、API payload、Main schema、Teaching ownership 或 provider side-effect 順序；不把 `identity.ts` 的 compatibility binding 宣稱成 runtime。

執行順序：

1. 用 CodeGraph 與現有測試列出 Visit／Orders／Support 的固定規則、可安全配置參數、provider 差異與真正重複的能力；每一項標示 owner 與 consumer。
2. 選一個最小且可回退的變化，先寫 behavior contract：輸入／設定、狀態、輸出、side effect、錯誤與 restore 行為。
3. 在原 domain owner 內實作或驗證 typed config／local policy；若現有 code 已能表達，直接記錄「不需新抽象」，不要為了完成 W1 硬加檔案。
4. 跑 focused contract、完整 `npm run verify:full`、CodeGraph impact／caller 檢查；受影響頁面照既有規則開 Chrome 做改前／改後／cleanup 驗證。
5. 把結論回寫本文件：保留 explicit use case、抽出最小 shared policy，或建立 W2 deferred gate。若沒有第二 consumer，明確 STOP，不建立 registry。

**本輪 W1 結果（2026-08-15）：**

- [x] 以 `Visit` 的既有 `line_agents.settings.requireApproval` 作為最小變化：`true` 維持人工核准／草稿路徑，`false` 走同一個 `createVisitLineOfferReplyHandler` 的直接寄送路徑。
- [x] focused contract 已覆蓋設定輸入、pending invite、Gmail provider 呼叫、LINE 回覆、run telemetry 與 conversation lock release；目前完整 verify 已通過 138 files／717 tests、93-page build、147-test hermetic browser smoke。
- [x] CodeGraph／caller review 未發現需要複製 route、建立單 caller wrapper 或新增跨域 registry 的證據；本批只增加一個 behavior contract test，沒有 production／UI／API／schema／provider side-effect 變更。
- [x] **決策：保留 explicit domain-owned workflow；W2 deferred。** 只有第二個獨立 consumer 或明確產品需求需要同一行為的選擇／版本化，才重新開 W2；在那之前不建立 `WorkflowDefinition` registry、binding runtime 或 JSON DSL。

| Check | 證明內容 | 失敗處理 |
|---|---|---|
| CodeGraph impact／caller | 沒有 route copy、單 caller 儀式層或新增跨域耦合 | 回到原 domain owner，撤回不必要的 wrapper |
| focused + full tests | 變化的規則、API／資料相容性與全域回歸 | 只回退 W1 變更，不影響既有 P2 evidence |
| Chrome affected journey | UI 外觀、互動順序、loading／success／error 與 cleanup 不變 | 停止 W1，不進 P6；修復或還原後再驗 |
| decision record | 清楚判斷 explicit／W2／W3，而不是留下模糊「以後再說」 | 將未決項標為 Unknown，指定 owner／觸發條件 |

- **Done When：** 一個可觀察的流程變化已可重跑；沒有複製 route／module；所有行為與回退證據存在；本文件已記錄 keep／extract／defer 決策。
- **Rollback／handoff：** W1 任一驗證失敗就回退本批 code／fixture，保留失敗證據；成功只把決策交給 P6／P7，不自動開 W2。只有第二個獨立 consumer 或明確產品需求出現，才重新開 W2。

3. **P3 — Recovery／replay 決策（D，可與 P1／P2／P4／W1／P5 平行整理）**
   - [x] KB embedding：先產生並驗證全部新 chunks，再以 service-role-only transaction 替換；Main staging rollback／replace、權限與 cleanup 已通過，失敗時保留上一版可搜尋 index。
   - [x] Visit delivery：`pending_invites.fulfilment_phase`／`fulfilment_error` 記錄 Calendar／Gmail／LINE／完成 checkpoint；重試只補未完成副作用，不重建已記錄 Calendar、不重寄已完成 Gmail。外部副作用成功但 checkpoint 寫入失敗仍列入人工 reconciliation，不宣稱 exactly-once。
   - [x] Visit timeout：以 `timeout_phase`／`timeout_error` 保存逾時判定、activity checkpoint、LINE notification 與完成狀態；partial failure 只重試缺少步驟，並以 legacy `declined` status 保持相容。
   - [x] Teachify exact replay／並行重送：以 `(order_id,event_key)` durable claim 記錄 `sending`／`delivered`／`failed`，claim 進行中回 202，不再第二次 LINE push；delivery state 寫入失敗回 `delivery_unrecorded`，避免假裝完整成功。
   - [!] Teachify stale／out-of-order：仍需官方 event ID／timestamp／狀態轉移契約與產品核准；目前 fingerprint 只保護相同 normalized event 的 exact replay。未取得契約前，不對同一 order 的不同狀態自動猜順序，也不新增會改變通知結果的 fallback。
   - [x] Support relay local policy：`deriveSupportRelayDeliveryKey(rawBody)` 保留 exact raw-body identity；legacy relay 未確認成功時記錄 `not_confirmed` 與 delivery key、仍捕捉 Main conversation，但明確不自動重送，交由 legacy owner 依 key 人工確認。
   - [!] Support provider replay：要把上述 local policy 升級成真實 replay／dedupe，仍需 Support LINE event identity、relay target owner 與可撤回的重播方式；在此之前不宣稱 exactly-once，也不引入通用 retry。
   - **Exit**：Visit public respond、Visit timeout phase、Teachify exact replay 與 Support relay local policy 已有 approved local behavior、idempotency／checkpoint、失敗狀態與 focused／remote probe 證據；Teachify stale／out-of-order、Support provider replay／rollback 仍等外部契約，未達 P3 full exit。

4. **P4 — 本地 provider readiness（G）**
   - [x] Visit inbound：本地 LINE signature、parsing、route、application 與 delivery failure contracts 已重跑；不宣稱已驗真實 reply token、媒體下載或 LINE callback。
   - [~] Teachify：valid／invalid signature、parse、DB、LINE delivery、delivered-but-unrecorded 與 exact replay claim contracts 已通過；duplicate 的 provider event／stale／out-of-order truth 仍缺，未自行猜測。
   - [x] Support：local signature／route contracts、synthetic conversation、relay double、Main capture／callback／report、failure 與 cleanup 已通過；未借用 Primary LINE channel，也未宣稱真實 Support provider 完成。
   - **Exit `[~]`**：既有 22 files／106 tests 加上本批 4 files／36 focused tests 與 remote claim probe，證明本地 provider contracts 與 exact replay ledger；Teachify provider event／stale／out-of-order、Support LINE 與 Visit inbound 仍有外部 gate。

5. **P5 — 外部資產（E，可與 P1–P4 平行取得）**
   - [x] `npm run doctor:staging`（2026-08-15）確認 Main 的 server-side write readiness、Teaching／OpenAI／Primary LINE／Google／Firecrawl／Cron 的設定狀態且未呼叫外部服務；目前只列缺少的名稱。
   - [!] 目前明確缺少：`LINE_SUPPORT_CHANNEL_ID`、`LINE_SUPPORT_CHANNEL_SECRET`、`LINE_SUPPORT_CHANNEL_ACCESS_TOKEN`、`TEACHIFY_WEBHOOK_SECRET`、`SUPPORT_RELAY_TARGET_URL`。這些只阻塞對應 P6 真實 journey，不阻塞本地 contracts、文件、測試與其他 domain。
   - Support LINE：專用 channel ID／secret／access token、測試 user／room，以及可安全改 webhook 的 owner。
   - Teachify：官方實際 signing spec／secret，加一筆 sandbox 或去識別可重播事件。
   - Support relay：既有客服 webhook target、owner 與 failure／rollback 聯絡人。
   - Deploy：canonical GitHub repo／branch、Zeabur project ownership、獨立 staging URL、revision／commit 可見性、secret store 與 release owner。`kva.zeabur.app` 現在可回 200 且有 webhook routes，但尚不能證明它是本 branch、隔離 staging 或可安全覆寫的環境。
   - Security／產品：輪替曾貼入對話的 OpenAI key；補齊既有全功能的 acceptance journeys、品牌／super-agent 邊界與 release owner。
   - **Exit**：每項都能指出 owner、環境、用途、允許副作用、撤回方法；只取得真正缺少的資產。

6. **P6 — 真實 provider journeys（G + E）**
   - [x] 2026-08-15 可自主重驗：OpenAI acceptance 1/1、Knowledge Base／Firecrawl 1/1、Google read 4/4；各自使用既有 gate／cleanup，未改 UI／API／schema。
   - [!] Primary composite 本次未執行：`PRIMARY_COMPOSITE_ACCEPTANCE` 未開啟，suite 3 tests skipped；保持安全停止，待明確允許後才可重跑 Broadcast／Orders／Team Lead 的 LINE side effects。
   - 部署目前驗證過的 commit 到獨立 staging，health/version 能對應 commit；先套 migration 再切流量。
   - Primary LINE：真實 inbound Visit text／image／postback、Calendar／Gmail／LINE 回覆與 timeout，全部限制測試 recipient。
   - Teachify：真實 provider signature／event → Orders persistence → 去重／replay → Primary LINE。
   - Support：專用 Support LINE inbound → capture → relay；確認既有客服 bot 回覆 owner，不讓 KV 搶答。
   - Reporting：GitHub hosted schedule → cron auth → Team Lead／Support report；Support delivery identity 先確認，不預設使用 Primary channel。
   - **Exit**：每條 journey 有 provider receipt、DB diff、UI evidence、cleanup、failure／retry evidence 與 owner sign-off。

7. **P7 — 核准需求與證據驅動的可靠性／架構收斂（A）**
   - 先把 P0 核准的功能逐條做成垂直 slice；每條都沿既有 domain owner 實作，不把 upstream 舊架構帶回來。
   - 只修 P2／P4／P6 暴露的 retry、idempotency、partial failure、observability 或契約問題；不再推測式搬檔。
   - 依 W1 結論處理可變流程：若 explicit use case 已足夠就停止；只有 W1 證明第二 consumer／共同故障模式時，才抽出最小 typed policy。不得把 W1 擴成 generic workflow engine。
   - [x] 共用 Agent 後台的設定／活動／真實狀態讀取已改為「成功才更新、失敗留診斷」；demo fallback 只在 demo 模式保留，PATCH 失敗會回復本地 optimistic state，不改 UI 結構或 API payload。
   - [x] Knowledge Base 的搜尋／索引失敗已改為「失敗就明示、空結果才代表真的沒有命中」；reindex／publish 的 failure response 與 Agent live context 均可診斷，沒有新增 generic layer。
   - [x] Agent 連線狀態卡片已共用 `integrationConnectionState`；載入中／查詢失敗不再以 `INTEGRATION_SEEDS` 的 presentation status 冒充 provider connectivity，UI 與 API contract 不變。
   - [x] 共用 integration status query 已區分 loading／success／probe failure；非 2xx 或 malformed response 會顯示「查詢失敗」，不把 provider 讀取錯誤當成「未連線」或無限 loading。
   - [x] Goal trend query 已區分 loading／valid empty／failure；趨勢讀取錯誤不再被顯示成「累積資料中」，正常不足兩筆仍維持原本文案。
   - [x] Agent status live read failure 已由 route 明確回 503／generic client-safe error；成功 `{enabled}` payload 與 UI 不變，避免資料庫讀取故障被誤報為靜態成功。
   - [x] Visit live task history live read failure 已由 route 明確回 503／generic client-safe error；成功 `{items}` payload 與 TV UI 不變，避免資料庫故障被誤報為沒有歷史。
   - [x] Visit research、Live task state 與 live image 的 live reads 已由 route 明確回 503／generic client-safe error；成功 payload 與 UI 不變，避免資料庫故障被誤報為沒有歷史／沒有任務。
   - [x] 2026-08-15 CodeGraph ownership recheck：`getMainSupabase`、Agent live context 與 `src/lib` 的 adapter／DB orchestration 都有跨 domain 或 provider／presentation consumer；未找到可在不改 contract 的情況下安全合併的單 caller 純轉發層，因此本批不做機械式搬檔。
   - 把重複 route wrappers、過細 rules／ports／application／adapter 收斂到 domain owner；保留確實隔離 provider／DB 的 adapter，不保留只轉呼叫的儀式層。
   - 以成熟 npm 套件取代已盤點、測試成本高且無產品差異的自造輪；每項先比較 bundle、維護度、契約與 migration cost，不做整包換框架。
   - **Exit**：新增抽象有至少兩個真實 consumer；刪除或合併的模組有 caller evidence；LOC／檔案數不因儀式層持續膨脹。

8. **P8 — CI／deploy／migration／rollback（E）**
   - [x] Repo CI 已有 quality／schema jobs並支援 manual dispatch；install、config、lint、typecheck、unit、build、Playwright smoke、migration replay、generated types drift 皆有固定命令。
   - [x] Release preflight 產生並驗證 service／version／commit／schema version／environment／migration inventory；dirty tree、Doctor blocked、commit/schema/profile mismatch 都會停止。
   - [x] Migration plan/apply 已使用單一 release CLI：DB URL 必須命中 staging／live project ref；plan 只比對 history＋dry-run；apply 另需 backup confirmation、explicit apply 與 project ref confirmation。
   - [x] `/api/version` 與 `/api/health` 支援 deployment identity；remote verify 必須比對 exact release commit、schema、environment 與 ready health，才可 promotion。
   - [x] README 已固定 additive migration、deploy、verify、application rollback、DB forward-fix／PITR recovery；禁止以 remote reset 當 rollback。
   - [!] 本機沒有 Docker／Podman，因此此次 local schema replay 無法重跑；不是 migration SQL failure。canonical hosted schema job可執行，但仍需在 canonical repo留下本 commit 的 run evidence。
   - [!] 仍需 release owner 提供 `SUPABASE_DB_URL`／backup evidence、canonical GitHub／Zeabur isolated staging與 scheduled failure通知目的地，才能實際 apply、deploy、verify與 rollback rehearsal。
   - **Exit `[~]`**：repo 內 P8 procedure／guards／contracts 已完成；實際 hosted staging deploy、migration promotion、remote verification與 rollback rehearsal仍是外部 release gate，未冒充已完成。

9. **P9 — Final cleanup 與交接（A）**
   - 刪除確定無 caller 的 dead code、誤用 demo data 與已完成使命的 transitional adapters；不清理未知 upstream 功能。
   - 跑完整 lint／typecheck／test／build／browser／provider matrix，更新 CodeGraph 與最小必要 README／runbook／本 TODO。
   - 列出已驗、未驗、已接受風險、營運 owner 與下一批需求入口。
   - **Exit**：乾淨 worktree、可追溯 commits、零遺留 fixture、文件與實際 revision 一致，可由另一位工程師依文件重現。

## 8. Readiness verdict

- **Verdict：`Needs Revision`（完整產品化計畫）**：不是因為目前不能工作；九月底 scope 已固定為現有功能全納入。Repo 內已一路完成到 P8 release gates；仍會影響完整產品化的是 P3 stale／out-of-order 與 Support recovery 語意、P5 外部 assets，以及 P8 hosted deploy／rollback ownership。W1 已完成且明確 deferred W2。
- **Scoped delivery 狀態仍成立**：現有 modular monolith 可承接已知 KV 需求；Main／Teaching DB、OpenAI、Firecrawl、Google、Primary LINE 與多數本地 contracts 已有證據。這不代表 Agent 已可任意配置，也不代表可直接當 multi-tenant SaaS。
- **第一個可執行 package：** P8 repo-local gate 已完成；下一個 package 是 release owner 在 isolated staging 依 README 執行 migration plan／backup confirmation／apply、部署 exact commit、remote verify 與 application rollback rehearsal。缺 owner／DB URL 時只能安全停止，不碰遠端資料。
- **可平行處理的 gate：** P0 scope 已固定，產品 owner 仍需補每個既有功能的 acceptance journey／release owner；可靠性 owner 可裁決 P3；外部協作者可取得 P5。這些未完成前，不猜 public contract、不把 local fixture 寫成 provider truth。
- **目前位置與唯一順序：** 已到 `P8 repo-local gates` → 等 external release owner 完成 `P8 hosted staging／rollback rehearsal` → `P9 cleanup／handoff`。P3／P5／P6 的 Support／Teachify external gates仍平行保留；W1 已 STOP 在 explicit workflow，除非新 consumer 觸發 W2。
- **若 W1 沒有第二 consumer：** 保留現有 explicit workflow，正式記錄 STOP；不建立 `WorkflowDefinition` registry。只有新需求真的出現，才重新開 W2／W3 gate。
- **真正外部 gate**：Support 專用 LINE、Teachify 真實簽章素材、Support relay target、canonical repo／Zeabur staging ownership、OpenAI key rotation，以及既有全功能的 acceptance owner／release owner。
- **禁止誤判**：本地自簽 fixture 只證明我們的 contract；可回 200 的 `kva.zeabur.app` 只證明 domain 存活。兩者都不能替代 provider receipt、commit identity、隔離 staging 或 rollback truth。

## 9. 文件政策

- 只保留本文件的 current truth、active TODO、blocker、key matrix與 readiness；完成細節壓成 outcome ledger。
- CodeGraph、source、tests、Git、staging query與 Chrome 保存執行證據；本文件不複製流水帳。
- 每次 meaningful drift 更新狀態並刪除過期敘述，不讓 TODO 再膨脹成歷史報告。
