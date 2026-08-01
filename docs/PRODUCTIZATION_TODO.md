# KV 產品化控制計畫

> 這是唯一的產品化 Plan／TODO／現況索引。完成批次的細節由 Git、tests 與 CodeGraph 保存；本文件只保留會影響下一步決策、依賴、驗證或交接的內容。

## Plan identity

| Field | Value |
|---|---|
| Lifecycle | Active |
| Profile | Master；只有實際 schema／traffic migration 套用 Migration gates |
| Release intent | Demand-driven production slices；不做 big-bang rewrite |
| Owner | CabLate 工程團隊 |
| Repository | `F:/ownproject/kv` |
| Branch／planning base | `codex/kv-wp0-toolchain`／`46944e8` |
| Merge base | `359d4c98035267df2711a376a439fdbc5720cc76` |
| Last verified | 2026-08-01；CodeGraph 405 files／3,442 nodes／7,311 edges；KV cloud staging 已 clean replay 並通過 catalog／Data API／affected Chrome 核對 |
| Requirements source | 本對話：保留 UI／UX 與現有資料格式，漸進產品化；同一實作批先完成可安全修改的程式碼，再集中執行heavy驗收 |
| Readiness | **Implementation Ready**：主庫 clean-room replay已完成；Main authenticated journeys、Teaching live read與其他provider真實驗收尚未關閉 |

## 1. Outcome and boundaries

### Outcome

CabLate 工程團隊能在不停止產品需求、不改變既有 UI／UX 與外部契約的前提下，以可預測成本理解、修改、驗證與擴充 KV。產品化採逐步改善，不要求先完成理論上的最終平台。

### Productized 的判定

- 新工程師能重建開發環境並找到畫面、API、business owner、資料來源與外部 provider。
- 核心 journey 有可重複的 authenticated／real-data 或明確 production-like 證據。
- 新需求能在單一 domain owner 內完成；碰到 legacy 時只遷移必要邊界。
- UI URL、文案、互動、DOM／visual、loading／empty／error state 沒有非預期差異。
- schema、外部 side effect、cutover 與 rollback 都有真實 rehearsal／reconciliation 證據。
- 無 consumer 的 framework、永久 shim、重複 owner 與只測 forwarding 的低訊號測試已清除。

### Non-goals

- NG-01：不重寫前端、不重新設計 UI／UX。
- NG-02：不另開空白專案建立第二套產品。
- NG-03：不為「未來也許會用」先建 framework、port、adapter、runtime 或資料表。
- NG-04：不在沒有 schema truth、backward compatibility 與 rehearsal 前改既有資料格式。
- NG-05：不強迫所有事件、workflow 或 Agent 共用同一套 runtime。
- NG-06：不把 route 數、檔案數、LOC、commit 或測試數量當作完成度；這些只作為異常訊號。
- NG-07：本階段不做一般性 security scan；既有 auth、secret、RLS 與 public callback 邊界不得被弱化。

## 2. GORE core

### Actors and intent

| Actor／consumer | Job／outcome | Current pain／risk | Product intent |
|---|---|---|---|
| CabLate 工程團隊 | 持續交付需求、除錯與 release | 原始 ownership、schema 與真實驗收不清；先前又曾過度拆層 | 讓產品每一批都更容易修改，而不是等待大型重構完成 |
| 後台操作者 | 以原畫面完成管理、會議、KB、Visit、Orders 等工作 | backend 改動可能靜默破壞資料或 side effect | 重構前後的可觀察行為保持一致 |
| 外部系統／事件來源 | LINE、Teachify、cron、Google、OpenAI 等可重送且可恢復 | duplicate、partial failure、delivery receipt 與 replay 不一致 | 只在真實風險與 consumer 證明後補可靠性能力 |
| Teaching system owner | 獨立維護教學產品與其資料語意 | KV 直接依賴 raw schema，可能把外部故障誤判成零資料 | 保留 Teaching 作為 source of truth，KV 只消費明確唯讀契約 |
| 後續開發者 | 新增 Agent、workflow、provider 或 UI 資料需求 | presentation、event、domain workflow 與 runtime 容易混成一套 | 從現有 domain owner 組合能力，不複製整條流程 |

### Goal model

| Goal ID | Type | Goal | Observable outcome |
|---|---|---|---|
| G-01 | Primary | 工程團隊可持續且安全地擴充 KV | 新需求有明確 owner、局部改動、相稱驗證與可回退 release |
| G-02 | Continuity | 整理期間既有產品持續可用 | affected authenticated journey、API contract 與 UI parity 無非預期差異 |
| G-03 | Enabling | 建立環境、資料與行為的可信基線 | KV 主庫可在自有環境重建；Teaching 有可驗證、可替換的唯讀外部契約 |
| G-04 | Maintainability | 一項 business behavior 只有一個 owner | CodeGraph 無重複 orchestration、route-specific 四件組與無理由 alias adapter |
| G-05 | Evolution | 產品化由需求與已知風險驅動 | shared abstraction 至少由第二 consumer、外部邊界或 transaction／recovery 需求證明 |
| G-06 | Acceptance／cleanup | 切換後可驗證、可恢復且沒有永久 transition artifact | production-like evidence、rollback rehearsal、legacy caller／traffic 歸零 |

### Requirements and invariants

| ID | Type | Requirement／invariant | Evidence |
|---|---|---|---|
| I-01 | UI invariant | URL、文案、responsive、互動順序與 loading／empty／error state不做非預期變更 | affected before/after browser interaction＋visual/DOM evidence |
| I-02 | Contract invariant | 沿用目前 API payload、status、webhook、cron 與 Dennis 的資料格式，除非另有產品決策 | focused contract／integration tests |
| I-03 | Data invariant | 不從 TypeScript cast 或 query 猜 database schema | schema-only introspection／dump＋migration rehearsal |
| I-04 | Continuity invariant | 缺環境只能降低 evidence level，不能用 fallback 冒充 real-data verified | evidence ledger |
| I-05 | Cross-database invariant | KV 主庫是自有 persistence；Teaching 是外部 source of truth。未經 ownership 決策不得跨庫寫入、dual-write、複製其 47-table schema或建立跨庫 transaction | dependency rule＋adapter contract＋CodeGraph caller check |
| R-01 | Ownership | route 僅負責 auth／parse／HTTP mapping；business decision 與 side effect ordering 位於 domain/application owner | CodeGraph caller／impact map |
| R-02 | Abstraction | 獨立 boundary 必須有多 consumer、外部 provider、transaction／recovery 或實質 translation | boundary review＋consumer evidence |
| R-03 | Delivery | 每批是可獨立 review、驗收、commit 與回退的 domain outcome | change contract＋commit＋rollback seam |
| R-04 | Feature lane | 產品需求不等待全案重構；被碰到的 legacy 只做完成需求所需的最小收斂 | feature intake record＋affected evidence |
| R-05 | Documentation | 只有一份 live plan；歷史施工細節不在文件內重複累積 | `docs/` count＋Git history |
| R-06 | External data truth | Teaching 的 unavailable／permission／schema error 不得被轉成「0 筆資料」；true empty與unavailable必須可區分，若未來加入snapshot則stale也必須可見 | adapter failure tests＋API／Meeting contract evidence |

## 3. Verified current state

以下 Fact 以 `766e814` 為 planning base；需求、推論、假設與未知不混作 Fact。

### Current architecture

```text
Frozen UI／pages
  → API routes（auth、parse、HTTP、composition）
    → src/modules/<domain>（rules、capability、workflow）
      → src/adapters/<domain>（Supabase／provider／legacy translation）
        → src/lib（仍在使用的具體 legacy helper）
          → Supabase／LINE／OpenAI／Google／Teachify／Firecrawl
```

目前是「modular monolith＋legacy compatibility boundary」。它已足以健康維護既有功能，但不代表資料庫、provider、runtime reliability 與 production-like acceptance 已產品化完成。

| ID | Fact | Evidence／anchor | Planning impact |
|---|---|---|---|
| F-01 | 共有 56 個 API `route.ts`；route 是 compatibility surface，不是模組切分單位 | `src/app/api/**/route.ts` | 不再按 route 建四件組 |
| F-02 | `src/modules` 50 files、`src/adapters` 40 files；兩者合計只有 7 files 不超過 15 行 | `rg --files`＋line count | WP-T只增加一個domain owner與一個external adapter；不再按route機械式拆分 |
| F-03 | 目前只有一份 docs 文件 | `docs/PRODUCTIZATION_TODO.md` | 保持單一 SSOT，但文件本身也必須瘦身 |
| F-04 | `createGoalsService` 有 goals／history 兩個 route consumer；Support report runner 有 cron／manual 兩個 consumer | CodeGraph callers | 這類共享 owner 有真實保留理由 |
| F-05 | Visit LINE ingress、Meeting realtime、Orders notification 等 capability 各有自己的 domain owner | `src/modules/visit/line-inbound.ts`、`meeting/realtime.ts`、`orders/orders.ts` | event 類型維持 domain workflow，不強迫成 Agent type 或共用 runtime |
| F-06 | 無 production caller 的 generic `RuntimeKernel`／in-memory scaffold 與 Visit draft runtime 已刪除 | CodeGraph 查無 `RuntimeKernel`；commits `d524d5a`、`8216f33` | 禁止在第一個真實 consumer 前重建平台 |
| F-07 | canonical Agent identity compatibility foundation 已存在；`AGENTS` 仍維持 legacy-compatible projection | `src/lib/agent-data.ts`、`src/modules/agents/identity.ts` | 全面 consumer cutover 改為需求觸發，不作固定前置工作 |
| F-08 | `.env.local` 已配置 auth 與 CabLate `kv-staging` publishable access；尚無 Main service role、Teaching 與其他 provider keys | key-name-only inventory＋staging Data API probe | 可開始 Main RLS／一般使用者 journey；privileged routes與外部 provider仍有各自 gate |
| F-09 | 最新完整自動驗證為 97 test files／481 tests、typecheck、lint、build | 本工作批release gate＋既有Playwright smoke 132／132 | 自動gate之外，本批另有Main staging catalog／Data API／affected Chrome evidence |
| F-10 | Teaching live project 有 47 public tables；KV source 只讀 `projects`、`project_sessions`、`enterprise_inquiries`、`quotations` | live schema introspection＋`src/adapters/operations/teaching-pipeline-source.ts` | Teaching 是共享外部產品，不納入 KV baseline ownership |
| F-11 | `getPipelineOverview` 同時供 Operations API 與 `operationsContext` 使用；四個query已逐一檢查error，任一失敗會使整份snapshot unavailable | CodeGraph callers／impact＋`tests/unit/{operations-pipeline,meeting-context,agent-overview-routes}.test.ts` | silent-zero failure已關閉；live read-only acceptance仍需Teaching env |

### Current source map

每個實作批開始前仍須用 CodeGraph 重驗；本表是 cold-start 索引，不取代 live caller map。

| Domain | UI／entrypoints | Current owner | Data／provider boundary | Current evidence |
|---|---|---|---|---|
| Auth | `/login`、auth routes、`proxy.ts` | `src/modules/auth/auth.ts`＋`src/lib/auth.ts` | signed cookie、auth env | real form login/logout verified；無資料庫依賴 |
| Operations | `/goals`、`/todos`、`/subscribers`、`/outputs`、`/tv` 與相關 APIs | `modules/{goals,checklist,subscribers,operations}` | `adapters/{goals,checklist,subscribers,operations}`；主 Supabase | staging read與Goals create已過；update/delete/error semantics待本批關閉 |
| Knowledge Base | `/knowledge-base{,/import}`、KB／cron APIs | `modules/knowledge-base/*` | `adapters/knowledge-base/*`；主 Supabase／Firecrawl／OpenAI | live schema/RPC與empty render已確認；DB-only CRUD/access待本批，provider ingestion/search另有gate |
| Meeting | `/meeting`、9 個 Meeting APIs | `modules/meeting/{session,audio,conversation,realtime}.ts` | `adapters/meeting/*`；主 Supabase／Storage／OpenAI | schema/storage已replay；session/turn/recording persistence待本批，voice/AI另有gate |
| Visit／Coco | LINE webhook、timeout、research、AI、public respond APIs；Visit／TV／Outputs | `modules/visit/*` | `adapters/visit/*`；主 Supabase／LINE／Google／OpenAI | ownership substantially consolidated；real event/data/recovery blocked |
| Orders／Reporting／Support | Teachify webhook、cron/manual reports、Support relay/callback | `modules/{orders,reporting,support}` | `adapters/{orders,reporting,support}`；主 Supabase與外部 providers | structure/contract/render done；delivery/retry evidence blocked |
| Agent identity／chat／TV | dashboard、Agent pages、TV、agent-chat API | `modules/{agents,agent-chat,live-task,tv}`＋`src/lib/agent-data.ts` | Agent／chat／live-task adapters；static roster＋主 Supabase | compatibility foundation done；全面 cutover deferred |
| Teaching pipeline | Operations pipeline API、Operations page、Meeting/chat live context | `src/modules/operations/pipeline.ts`＋`src/adapters/operations/teaching-pipeline-source.ts` | **獨立 Teaching Supabase，唯讀四表** | typed boundary／failure semantics／consumer cutover完成；live real-data驗收待env |

### Progress by evidence dimension

| Area | Ownership／structure | Contract | Render／auth | Real data／provider | Next trigger |
|---|---|---|---|---|---|
| Auth | Done | Done | Functionally verified | N/A | auth 行為改變時重驗 |
| Operations | Done | Done | Authenticated Chrome read/create passed | Main read＋create verified；update/delete active | 補完staging update/delete與privileged routes |
| Teaching pipeline | Done；單一domain＋adapter | Success／empty／partial failure／timeout與兩consumer已測 | Operations＋TV affected Chrome passed | Live schema acquired；real-data read pending env | 提供Teaching runtime env後跑read-only acceptance |
| Knowledge Base | Done | Done | Staging empty render passed | DB-only journey ready；provider pending | 先完成CRUD/access/empty RPC，再等OpenAI／Firecrawl驗ingestion/search |
| Meeting | Done | Done | Render smoke | DB/storage journey ready；voice provider pending | 先驗session/turn/finish/recording，再等OpenAI驗voice |
| Visit | Substantially done | Done for current paths | Render smoke | Blocked | 真實需求或可靠性風險決定下一個 slice |
| Orders／Reporting／Support | Done for current owners | Done | Render smoke | Blocked | 真實 webhook／cron/delivery fixture |
| Agent model | Compatibility foundation done | Done | Render smoke | Partially blocked | 第一個新增 Agent／workflow／provider 需求 |
| UI projections | Existing UI preserved | Existing API contracts | Smoke passed | Blocked | 只有資料來源實際改變或重複 mapping 時建立 projection |

### Completed structural consolidation ledger

| Area | Representative commits | Result |
|---|---|---|
| Corrective audit／plan reset | `410083a`、`996a4e0` | 發現 route-level 四件組膨脹並改成 domain-first |
| Operations | `b39bd33`、`88449ae`、`a5c5685`、`b5f9fc0` | Goals／Checklist／Subscribers／read models 收成少量 owner |
| Knowledge Base | `99856c3`～`265075b` | Documents／ingestion／crawl／search 依 capability 收斂 |
| Meeting | `c163f1b`～`7a034ab` | Session／audio／conversation／realtime 收斂 |
| Orders／Reporting／Support | `005c478`、`21fe9e2`、`015800b`、`caff8a9` | 保留真實 side-effect 與 provider boundary，移除 route alias |
| Agent／UI read boundaries | `f866340`、`035c192`、`ff51633`、`eeecb1e` | identity compatibility、live-task、AI usage、TV read model 收斂 |
| Visit／dead scaffold cleanup | `cc0780c`、`fc97689`、`c610836`、`8216f33`、`d524d5a`、`5fc13ec` | 保留 live workflow，刪除無 consumer runtime與薄包裝 |
| Schema／cross-batch evidence | `4bbec8e`、`a979489` | 記錄 provenance 缺口與 test-env smoke，不冒充 real data |
| Teaching external boundary | `9a96303` | 單一Operations domain＋typed read-only adapter；關閉silent-zero並刪除legacy helper |

## 4. Architecture and evolution decisions

| ID | Decision | Consequence／revisit trigger |
|---|---|---|
| D-01 | 在原 repo 漸進整理 | 保留 Git history、既有 UI/API/data compatibility；不建立平行產品 |
| D-02 | 目前 modular monolith 架構已可維護 | 停止為架構外觀繼續拆／併；只有需求、重複 owner或高風險 failure 才改 |
| D-03 | 採 touch-and-migrate | 新需求碰到 legacy 時，先固定 affected behavior，再移動完成需求所需的最小邊界 |
| D-04 | 事件類型、Agent identity、domain workflow、runtime reliability 分開建模 | Visit text、Orders webhook、daily report 不因都會「發生」就強制共用 workflow runtime |
| D-05 | 舊 WP-04 的 event／CAS／lease／outbox 設計降級為候選 primitives，不再是預先選定的完整 canonical runtime | 先取得 schema truth；第一個真實流程只建必要能力，第二 consumer 出現才提升共享 abstraction |
| D-06 | 保留 Agent identity compatibility foundation；全面 config／consumer cutover 改為需求觸發 | 新增 Agent／workflow／provider 時用真實 acceptance 證明 model，不做 catalog-driven 搬家 |
| D-07 | 不執行 blanket UI projection cutover | 只有資料來源改變、跨頁重複 mapping 或寫讀 ownership 衝突時建立 projection |
| D-08 | cheap gates 每批跑，heavy browser/provider/schema 驗證依 affected domain 集中跑 | 不用 docs-only 或 API-only micro-cut 反覆測無關 catalog；cutover 前不得延後高風險 evidence |
| D-09 | 本文件維持 live current state；歷史 evidence 由 Git 承擔 | 不再新增 route-level Markdown、micro-checkpoint 或每日流水帳 |
| D-10 | KV 主庫與 Teaching 保持兩個明確 owner | Main 在 CabLate 自有 Supabase 重建；Teaching 暫作 external read-only provider。現在不複製四表、不dual-write；只有可靠性 evidence 才規劃本地 snapshot，只有產品 ownership 轉移才另開完整 data migration |

### Boundary keep／collapse gate

保留獨立 boundary 必須至少符合一項：

- 兩個以上 production consumers 共用。
- 外部 provider／SDK／protocol 需要替換、sandbox、timeout、rate-limit 或 error translation。
- transaction、idempotency、lease、CAS、outbox、retry、replay 或 reconciliation。
- payload／database row／error 有實質 translation。
- application 明確協調多個 side effects、等待或 failure branch。

預設收斂：single-caller interface、純 forwarding application、alias adapter、同一 CRUD resource 的 route-specific 四件組、只驗證 forwarding 的測試。

**停止條件：** 如果改動不能降低重複 owner、縮小需求 blast radius、提高 failure 可驗證性或支援已知 consumer，就停止結構重構。

## 5. Database and environment truth

### Verified static evidence

- Chrome 直接進入 tbr 組織的 Supabase Dashboard；OAuth connector 因協作者無組織授權權限失敗，但不影響 project-level read access。
- Main project `time_alert`（ref `ytrolpaeuckdwgvifdhl`）已 read-only introspect：32 public tables、310 columns、66 constraints、66 indexes、6 public functions、94 public／storage policies、1 custom auth trigger、1 private Storage bucket，以及 33 筆 migration history metadata。
- `supabase/migrations/20260801000000_live_baseline.sql` 已由 live catalog 產生並成為唯一active baseline migration；包含原 repo 缺少的 base DDL、`match_kb_chunks`、KB 實際欄位、RLS／ACL 與 `meeting-recordings` bucket metadata；不含 production rows、auth users、secret 或 migration statement bodies。
- CabLate `kv-staging`（ref `gizswqvyavkfrtndfzsb`，Seoul）已由空白 project 套用canonical baseline；修正catalog經JS傳遞造成的bigint sequence max rounding後，重播成功。
- Staging 與來源catalog精確核對：32 public tables、310 columns、66 constraints、66 indexes、6 public functions、94 public／storage policies、32個RLS-enabled tables、1 custom auth trigger、1 private Storage bucket；`metric_snapshots_id_seq` max為`9223372036854775807`。
- Publishable key經PostgREST讀取`agent_goals`回HTTP 200／空集合，證明Data API exposure與anon read path可用；service-role與authenticated UI／CRUD仍須分開驗收。
- 本機以既有登入狀態在Chrome驗收`/goals`、`/subscribers`、`/outputs`、`/knowledge-base`：四頁均載入staging且無console error；Goals第一次讀取依既有行為初始化16筆demo goals，UI建立暫存目標後雲端count變17，精確清理後頁面恢復16。Main read／create已證明；update、app-level delete與service-role路徑仍未關閉。
- DDL後advisor顯示來源baseline既有債務：63項security WARN，以及73項performance建議（37 WARN／36 INFO）；這些不是replay drift，也不在本批擴成全面安全整改，後續依實際journey與風險排入hardening slice。
- 原Local 7 份增量 migration均早於8/1 live snapshot且已被baseline吸收，已自active migration chain移除，由Git history保存；後續只新增forward-only delta。
- CodeGraph／source 對第二個 `教學系統` project（ref `wsaknnhjgiqmkendeyrj`）只引用 `projects`、`project_sessions`、`enterprise_inquiries`、`quotations`；live project 實際有 47 public tables，屬共享產品資料庫，不應整包複製進 KV。
- Teaching 的四表契約已取得，但它們依賴共享的 `organizations`、`user_profiles`、`is_super_admin()` 與 `auth.users`；KV 應把它視為 external data contract，而不是假裝擁有其 migration。

### Database ownership and data flow

| Data／capability | Source of truth | KV responsibility | Freshness／failure contract | Future trigger |
|---|---|---|---|---|
| Agent、LINE、Meeting、KB、Contacts、Tasks | CabLate KV Supabase | schema、migration、read/write、recovery與release全權負責 | 由自有 staging／production 驗證；錯誤不可由empty fallback掩蓋 | 正常 forward-only migration |
| Teaching pipeline summary | Teaching Supabase | 唯讀四表、轉成 `PipelineOverview`、保留API／UI契約 | empty、unavailable、permission/schema error必須可區分；live驗收記錄時間與project identity | 有持續availability／latency證據才加本地snapshot |
| Teaching 47-table domain | Teaching system owner | 不擁有、不複製、不跨庫寫入 | 透過external contract隔離schema drift | 只有產品ownership正式轉移才啟動獨立data migration |

### Remaining database work

| Project | Current truth／remaining gap | Consequence |
|---|---|---|
| Main Supabase | `kv-staging` clean replay、catalog diff與Main DB-only affected journeys已通過 | 可以clean rebuild並承接需求；forward migration rollback留到第一個真實delta |
| Teaching Supabase | 四個 consumer table 的 live contract 已取得；它是 47-table 共享系統且有外部 FK／RLS dependency | 建立 adapter contract／fixture，不把整個 Teaching DB 納入 KV ownership |
| Runtime env | `.env.local` 已有Main staging URL／publishable key；沒有secret/service-role、Teaching endpoint／key | 先用目前實際anon contract跑完整Main journey；只有route確實需要bypass RLS時才把secret key列為blocker，不為勾選項目先升權 |
| Providers | LINE／OpenAI／Google／Teachify／Firecrawl key或安全 fixture尚未提供 | 不能把 mock/empty UI 升級成 production-like evidence |

### Resolution package DB-01

**State:** Clean replay complete；runtime acceptance active。Schema 透過 Dashboard read-only 取得；原始 catalog snapshot 僅留在本機稽核目錄，不提交大型 dump。

**Required evidence:**

1. [x] 取得 Main 與 Teaching 的 tables、columns、PK/FK、indexes、extensions、RLS/policies、functions/triggers 與 Storage metadata。
2. [x] 只記 project class／reference；不把 key、production rows 或 auth users提交 Git。
3. [x] 以 CodeGraph／source確認Main consumers與Teaching 4-table contract；以live catalog補齊Main 32 tables、6 functions及repo migration缺口。
4. [x] 在CabLate空白`kv-staging`套用canonical baseline，修正bigint序列上限精度並比對catalog counts／definitions一致。
5. [x] 將既有7份migration分類為已吸收歷史並自active chain移除，避免clean setup重複建立同一物件；後續只加forward-only delta。
6. [x] 由 WP-T 為Teaching四表建立明確adapter contract、fixture、錯誤語意與ownership；不複製47-table shared schema。
7. [x] Main publishable env、Data API與authenticated pages已通過；WP-MAIN另完成Goals create／update／API delete／reset、Checklist toggle、Subscribers tag update、KB CRUD／access、Meeting DB／Storage persistence、signed URL與Outputs read。應用runtime不需secret；只有管理者清理無delete policy的錄音測試物件時使用一次server secret，未寫入env／browser／Git。

**Blocks now:** 主庫schema猜測、clean rebuild與Main DB-only runtime baseline已解除；KB provider ingestion/search、Teaching live integration、provider-backed journey、rollback rehearsal與production cutover仍受後續gate限制。

**Safety rule:** canonical baseline migration只套用clean environment；不得直接push到來源production project。後續production變更一律以forward-only delta migration進行。

## 6. Execution tracks and active TODO

### Work graph

```text
WP-00 Current-state／plan reset（完成）

WP-F Feature lane（隨時可執行）
  └─ affected baseline → 最小需求實作 → touch-and-migrate → affected evidence

WP-DB KV primary rebuild → WP-MAIN Main DB-only functional baseline ─┐
WP-T Teaching external boundary ──────────────────────────────────────┼→ WP-B Evidence ledger
Provider credentials／sandbox ────────────────────────────────────────┘
      → WP-D Demand/risk-driven domain slice
          → WP-R Shared reliability primitive（只有第二 consumer 證明時）
              → WP-X Cutover／cleanup
```

WP-F、WP-DB與WP-T可依衝突面並行；canonical baseline migration、env與Operations public contract各有單一serial owner。WP-DB只負責KV主庫，WP-T只負責Teaching外部讀取，兩者不得混成同一repository或migration。

| WP | Outcome | State | Depends on | Produces／next gate |
|---|---|---|---|---|
| WP-00 | 現況、版本、映射、依賴與完成維度重新可信 | Complete | none | 本文件與 current source map |
| WP-F | 新需求在現有產品可持續交付，並局部改善被碰到區域 | Ready／ongoing | affected source preflight | feature evidence；可能觸發 WP-D |
| WP-DB | KV主庫在CabLate自有Supabase可clean rebuild | Replay complete | `kv-staging`＋Main runtime env | baseline replay／catalog diff／Data API evidence；handoff給WP-MAIN |
| WP-MAIN | 不依賴外部provider的Main資料功能在staging可讀寫、可辨識錯誤並可清理測試資料 | Complete | WP-DB；既有UI/API/data contract | Main DB-only functional baseline與key-class evidence |
| WP-T | Teaching成為Operations擁有的typed、read-only、failure-aware外部契約 | Implementation complete；live acceptance pending env | live四表schema＋既有API contract | 已產出adapter contract／fixtures／兩consumer cutover／legacy deletion |
| WP-B | 核心 journey 有real-data/provider-safe baseline | Main baseline complete；external gates分離 | 主庫journey依WP-MAIN；Teaching pipeline依WP-T；其餘依provider fixture | 可比較的before behavior與failure map |
| WP-D | 一個高價值 domain 問題以最小 production slice改善 | Conditional | 真實需求／風險；資料型工作另需 WP-B | 單一新 owner或可靠性能力＋rollback seam |
| WP-R | 兩個不同 consumer 共用已被證明的 primitive | Deferred／conditional | 至少兩個 WP-D consumer | shared idempotency／outbox等；不是通用 workflow平台 |
| WP-X | 新路徑穩定、舊路徑歸零、團隊可 release／rollback | Pending | affected WP-D／WP-R | production-like evidence＋cleanup |

### WP-F — Feature lane

每項需求依序：

1. 用 CodeGraph 找 affected UI、API、business owner、data/provider、callers與tests。
2. 保存使用者可觀察的 before；只對 affected surface 建 change contract。
3. 若已有乾淨 owner，直接在該 owner實作；不要為了產品化再包一層。
4. 若碰到 legacy，先固定 contract，再把完成需求所需的最小 decision／side effect 移到 domain owner。
5. 若受 DB／provider阻塞，完成可獨立驗證的 pure logic／contract；將 integration evidence 明列 deferred owner與gate。
6. 一個需求 outcome 一個 commit；不要把無關全域清理混入。

**Done when:** 需求完成、affected behavior有相稱 evidence、blast radius沒有擴大，且沒有新增無刪除條件的 transitional code。

### WP-MAIN — Main staging functional baseline

**Outcome／goals:** 支援G-02、G-03、G-04與I-01～I-05。工程師能以目前Main staging完成不依賴LINE／OpenAI／Google／Teachify／Firecrawl的代表性資料journey；資料庫錯誤不得被成功空集合掩蓋，UI／UX、API成功payload與既有資料格式不變。

**Scope／non-changes:** 重用現有Goals、Checklist、Subscribers、Knowledge Base、Meeting owner與adapter；不建立route-level四層模組、不改UI、不在本批全面重寫RLS、不呼叫會產生真實外部副作用的provider。Goals空庫仍維持16筆示範目標的既有可見結果，但初始化／reset任一步驟失敗必須可診斷，不能回傳假成功。

**Implementation wave（先改完，最後集中驗）:**

1. 以CodeGraph與source重驗上述entrypoint、repository、caller與現有tests；只修會影響本批journey的忽略error、部分寫入或假empty路徑。
2. 完成Goals read／create／update／delete／reset與Checklist toggle；讓Supabase read/write error走既有API failure boundary，保留成功payload。
3. 完成Subscribers list／update，以及Outputs／activity等Main read model；LINE profile、broadcast等外部副作用只保留fixture contract。
4. 完成Knowledge Base document CRUD／access與empty index/RPC；PDF、crawl、embedding/search只做到無憑證時的明確failure，不宣稱provider成功。
5. 完成Meeting start／turn／finish／private recording persistence；transcribe／speak／realtime AI保留provider gate。
6. 先使用publishable key驗證實際現況；只有某條server route因合法RLS需求無法完成時，才取得server-only secret key並記錄該route，禁止把secret放進browser或Git。

**集中驗收：** 程式碼wave完成後才一次執行focused＋full tests、typecheck、lint、build；再以同一批Chrome session點完affected頁面與互動，逐條核對staging row／storage side effect，最後刪除所有`codex-e2e-*`暫存資料。失敗回到實際owner修正後，只重跑affected gate與一次final full gate。

**Done when:** Goals與Checklist具完整UI/API/DB create-or-update/delete evidence；Subscribers與read models有真實staging evidence；KB DB-only與Meeting persistence完成且provider缺失不冒充成功；測試資料清零；CodeGraph無新增低訊號boundary；本批以coherent outcome commit並更新本文件。

**Current completion:** 完成。CodeGraph確認沿用既有owner，未新增route-level四層包裝；99 test files／491 tests、typecheck、lint、production build全過。Chrome以真實登入依序驗Goals、Todos、Subscribers、Knowledge Base、Meeting與Outputs，無console error；API補驗Goals delete／reset與Meeting multipart recording。Staging核對meeting turn／finish／recording path／signed URL與subscriber／KB／checklist／access side effect，最後確認16筆預設Goals且所有`codex-e2e-*` DB／Storage資料為0。錄音正式保留／刪除政策仍屬產品生命週期決策；本批未為方便測試而開放anon delete。

### WP-T — Teaching external data boundary

**Outcome／goals:** 支援G-02、G-03、G-04與I-02、I-05、R-01、R-02、R-06。Operations API與Meeting context維持現有成功payload；Teaching故障不再被呈現成可信的零資料。

**Current anchors:** `src/modules/operations/pipeline.ts#buildPipelineOverview`；`src/adapters/operations/teaching-pipeline-source.ts#getPipelineOverview`；`src/app/api/agents/operations/pipeline/route.ts`；`src/lib/meeting-context.ts#operationsContext`。CodeGraph impact顯示domain mapping經單一adapter composition供Meeting consumer使用；route的function-value引用另以source map／route contract補足。

**Target ownership:**

| Capability | Target owner | Responsibility | Forbidden responsibility |
|---|---|---|---|
| Pipeline model／分類／統計 | `src/modules/operations/pipeline.ts` | canonical `PipelineOverview`、row-to-domain translation與aggregation | 建立Supabase client、認識env或隱藏provider error |
| Teaching reads | `src/adapters/operations/teaching-pipeline-source.ts` | typed四表select、read-only client、timeout／error translation | business分類、跨庫寫入、把error轉成empty |
| HTTP／Meeting consumers | 既有route與`operationsContext` | 呼叫同一Operations use case並維持既有輸出 | 直接query Teaching或各自重做mapping |

**Steps:**

- [x] 以現有`PipelineOverview`與兩個consumer建立success／empty／provider-error change contract。
- [x] 在Operations domain內建立一個`TeachingPipelineSource` contract與既有business mapping；未為四張表各建service／port／adapter。
- [x] adapter加入精確row types、四個query的error檢查與一致failure translation；保持anon/read-only且未新增寫入。
- [x] route與Meeting context切到同一Operations use case；外部成功payload與UI維持不變。
- [x] 用fixture驗證正常、真正empty、permission／部分query失敗與timeout。
- [ ] 提供`TEACHING_SUPABASE_URL`／`TEACHING_SUPABASE_ANON_KEY`後，對live Teaching執行四表read-only acceptance並核對count／sample shape。
- [x] CodeGraph sync後確認legacy符號消失，並刪除`src/lib/teaching-system.ts`與過期mock。

**Failure contract:**

| State／failure | Detection | Required behavior | Evidence |
|---|---|---|---|
| True empty | 四個query成功且row count為0 | 回傳既有零值／空陣列success payload | empty fixture＋route contract |
| Missing env／auth拒絕 | client preflight或Supabase error | API走既有502 boundary；Meeting不得產生「0筆」敘述 | negative fixture＋consumer test |
| Schema drift／單一query失敗 | 每個query檢查`error`；任一失敗即整份snapshot unavailable | 不混合部分成功資料，不回傳假零值 | partial-failure tests |
| Timeout／network failure | 共用8秒`AbortSignal`（測試可注入較短timeout） | 同provider failure；不洩漏key | timeout fixture |

**Failure／rollback:** 任一consumer parity失敗時回退整個WP-T commit，不保留半套新舊路徑；不得以catch後回傳全零作rollback。外部不可用時由既有API 502／Meeting failure boundary處理，或另行設計最後成功snapshot，但後者必須有獨立需求與freshness contract。

**Current completion:** code／contract／affected Chrome gate已完成；唯一未關閉項是live Teaching read-only acceptance，原因是runtime env尚未放入KV。這不阻塞後續主庫WP-DB，但在宣稱Teaching real-data production-like前必須補驗。

**Done when:** 兩個consumer通過contract與affected browser驗證；Teaching error不再冒充empty；CodeGraph無direct Teaching query散落；legacy helper刪除；未新增local table、dual-write或generic data-source framework；live read-only count／shape已核對。

**Deferred decision:** 只有觀測到Teaching availability／latency影響SLO時，才規劃KV-owned read snapshot與同步／reconciliation；只有Teaching產品ownership移交時，才規劃完整schema與data migration。兩者都不是WP-T完成條件。

### WP-B — Core functional baseline

依dependency分成現在可完成與外部gate，不再把兩者混成一條模糊清單：

- Auth：login→protected page→logout。
- **現在執行（WP-MAIN）：** Operations代表性read/write、Knowledge Base DB-only CRUD/access/empty RPC、Meeting persistence/storage、相鄰Main read models。
- **取得Teaching env即執行（WP-T）：** Operations API／頁面與Meeting context的success、true empty、unavailable。
- **取得sandbox／安全fixture才執行：** KB import/crawl/embedding/search、Meeting voice/AI、Visit LINE、Teachify webhook與LINE delivery；未取得前只驗contract與明確failure。

每條 journey 保存 input、data source、side effect、result、error/recovery與browser/API/DB evidence。沒有執行到的路徑保持 Pending，不用整頁 smoke 取代。

### WP-D — Demand/risk-driven domain slice

候選順序不是固定 roadmap；每次由當下需求、營運風險與 WP-B evidence決定：

| Trigger | 最小 slice | 不自動擴張成 |
|---|---|---|
| KB actual schema/RPC drift 阻礙功能 | 修正 baseline／mapping／integration test | 全面重寫 KB平台 |
| LINE／Teachify duplicate或lost delivery有證據 | 對該一條 flow 加 admission／idempotency／receipt | 通用 Agent runtime |
| Cron/report無法追蹤或安全重跑 | 對該 business period 加 artifact／replay semantics | 所有 background job framework |
| 新增一個 Agent／workflow／provider | 擴充 identity/config與該 consumer mapper | 全 catalog／UI一次搬遷 |
| 多頁出現相同資料 mapping或source切換 | 建一個共享 read projection | blanket UI projection cutover |

### WP-R — Shared reliability primitive

只有第二個真實 consumer出現且語意相同時才抽出。共享的通常是 idempotency、atomic claim、outbox、receipt、correlation或reconciliation；domain workflow、event parsing與Agent presentation仍各自擁有。

**Rejection gate:** 如果 abstraction 只能靠名稱相似、fixture或未來想像證明，留在第一個 domain內。

## 7. Verification, cutover and cleanup

### Evidence levels

1. `Structurally verified`
2. `Contract tested`
3. `Render smoke passed`
4. `Functionally verified`
5. `Production-like verified`

不得把低層證據升級描述。Current source map、test-env Playwright、mock provider與empty fallback都不能單獨證明 real-data journey。

### Evidence by change

**Batch policy:** 同一WP先完成所有可安全修改的程式碼與focused contract，不在每個route或API-only micro-cut後重跑Chrome／full build。Heavy gate只在WP整合點集中跑一次；若失敗，修正後跑affected gate，最後再跑一次full gate。不可延後的只有dirty-worktree檢查、不可逆資料操作、migration／secret風險與低成本syntax/type evidence。

| Change | Minimum during implementation | Heavy／deferred gate |
|---|---|---|
| Docs／plan only | encoding、links/anchors、stale refs、`git diff --check` | 只有改變 runtime claim或操作指令時才需browser sanity |
| Pure domain rule | focused unit＋typecheck | affected integration before release |
| Route／application | focused contract／API tests＋cheap static gates | domain batch結束時點 affected authenticated interaction |
| Repository／schema | integration＋local rehearsal＋rollback/reconcile query | staging real-data／migration gate |
| Provider adapter | fixture contract＋timeout/error/partial failure | sandbox／canary when available |
| UI data source／interaction | component/contract＋before baseline | affected authenticated desktop/mobile interaction＋visual |
| Runtime／cutover | duplicate/retry/restart/replay＋parity | canary、telemetry、rollback rehearsal |

### Cutover gate

- Same input/output/error與UI contract有 parity evidence。
- 資料 key、count、state與side effect可reconcile。
- duplicate delivery／lost action有 prevention與receipt。
- correlation、error、latency與replay結果可查。
- old path仍可安全回退，且rollback不會反向遺失資料。

### Cleanup gate

- legacy route owner沒有 caller／traffic。
- WP-T legacy `src/lib/teaching-system.ts`已在兩個consumer切換、CodeGraph sync與source search確認後刪除，未留下forwarding shim。
- compatibility window與reconciliation完成。
- shim、flag、shadow/dual-write、dead schema/code/test/dependency已刪或有明確保留決策。
- README／本文件與CodeGraph指向新owner。
- 另一位工程師能依env/runbook重跑release與rollback。

## 8. Traceability and readiness

| Goal | Requirements／invariants | Work packages | Outcome evidence |
|---|---|---|---|
| G-01 | R-01～R-04 | WP-F、WP-D、WP-X | 新需求局部交付、owner明確、可回退 |
| G-02 | I-01、I-02、I-04、R-06 | WP-F、WP-MAIN、WP-T、WP-B、WP-X | affected functional＋visual parity；external error不冒充empty |
| G-03 | I-03～I-05、R-06 | WP-DB、WP-MAIN、WP-T、WP-B | Main clean replay／DB-only journey、Teaching contract、env identity與real journey |
| G-04 | R-01、R-02、R-06 | WP-F、WP-MAIN、WP-T、WP-D | CodeGraph owner/caller與contract evidence |
| G-05 | R-02、R-04 | WP-D、WP-R | 第二 consumer或真實可靠性需求 |
| G-06 | R-03 | WP-X | production-like、rollback、legacy deletion |

### Verdict: Main baseline complete；external acceptance active

**整體 blocker:** Main baseline已clean replay且WP-MAIN完成。Teaching live read與provider-backed journeys仍受獨立env／sandbox限制，因此不阻塞Main code與DB-only functional baseline，但會阻塞對應domain的production-like宣告。

**現在可執行:** WP-T只差Teaching runtime env的live read；其餘依真實需求走WP-F／WP-D，不再做無需求支撐的全域抽象整理。取得對應sandbox後，再逐domain補provider-backed WP-B evidence。

**被阻塞:** Teaching live read需獨立endpoint／key；LINE／OpenAI／Google／Teachify／Firecrawl production-like journey需相應sandbox／fixture。Main secret key只有實際route證明需要時才成為blocker。Teaching local snapshot與完整data migration不是blocker。

**升級條件:** WP-T補上live read後，Teaching consumer可升級為production-like baseline；其餘domain只在取得provider sandbox與真實需求後逐一升級，不要求先搬完整個系統。

## 9. Documentation policy

- 本文件是唯一 live plan、TODO、現況索引與 readiness verdict。
- 完成批次只在 ledger 保留一行 outcome＋代表 commit；詳細 evidence由Git、tests、Playwright artifacts或DB query保存。
- Live symbol mapping由CodeGraph重驗；本文件只保留cold-start所需的stable owner path。
- 不建立route-level Markdown、micro-checkpoint、每日流水帳或另一份runtime／migration roadmap。
- 文件每次更新都移除過期snapshot、已完成細節與不再改變決策的段落；單一文件不等於可以無限制增長。
