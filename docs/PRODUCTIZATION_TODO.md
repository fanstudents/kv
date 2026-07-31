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
| Branch／planning base | `codex/kv-wp0-toolchain`／`a979489` |
| Merge base | `359d4c98035267df2711a376a439fdbc5720cc76` |
| Last verified | 2026-08-01；CodeGraph 402 files／3,408 nodes／7,071 edges |
| Requirements source | 本對話：保留 UI／UX 與現有資料格式，在持續承接需求時漸進產品化 |
| Readiness | **Needs Revision**：程式結構可繼續維護；資料庫真相、真實資料與 provider 驗收尚未關閉 |

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
| 後續開發者 | 新增 Agent、workflow、provider 或 UI 資料需求 | presentation、event、domain workflow 與 runtime 容易混成一套 | 從現有 domain owner 組合能力，不複製整條流程 |

### Goal model

| Goal ID | Type | Goal | Observable outcome |
|---|---|---|---|
| G-01 | Primary | 工程團隊可持續且安全地擴充 KV | 新需求有明確 owner、局部改動、相稱驗證與可回退 release |
| G-02 | Continuity | 整理期間既有產品持續可用 | affected authenticated journey、API contract 與 UI parity 無非預期差異 |
| G-03 | Enabling | 建立環境、資料與行為的可信基線 | 兩個 Supabase project、provider、核心 journey 與 schema provenance 可重現 |
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
| R-01 | Ownership | route 僅負責 auth／parse／HTTP mapping；business decision 與 side effect ordering 位於 domain/application owner | CodeGraph caller／impact map |
| R-02 | Abstraction | 獨立 boundary 必須有多 consumer、外部 provider、transaction／recovery 或實質 translation | boundary review＋consumer evidence |
| R-03 | Delivery | 每批是可獨立 review、驗收、commit 與回退的 domain outcome | change contract＋commit＋rollback seam |
| R-04 | Feature lane | 產品需求不等待全案重構；被碰到的 legacy 只做完成需求所需的最小收斂 | feature intake record＋affected evidence |
| R-05 | Documentation | 只有一份 live plan；歷史施工細節不在文件內重複累積 | `docs/` count＋Git history |

## 3. Verified current state

以下 Fact 以 `a979489` 為 planning base；需求、推論、假設與未知不混作 Fact。

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
| F-02 | `src/modules` 49 files、`src/adapters` 39 files；兩者合計只有 7 files 不超過 15 行 | `rg --files`＋line count | 早期 197／72 files 的過度拆分已大幅修正，不再機械式 consolidation |
| F-03 | 目前只有一份 docs 文件 | `docs/PRODUCTIZATION_TODO.md` | 保持單一 SSOT，但文件本身也必須瘦身 |
| F-04 | `createGoalsService` 有 goals／history 兩個 route consumer；Support report runner 有 cron／manual 兩個 consumer | CodeGraph callers | 這類共享 owner 有真實保留理由 |
| F-05 | Visit LINE ingress、Meeting realtime、Orders notification 等 capability 各有自己的 domain owner | `src/modules/visit/line-inbound.ts`、`meeting/realtime.ts`、`orders/orders.ts` | event 類型維持 domain workflow，不強迫成 Agent type 或共用 runtime |
| F-06 | 無 production caller 的 generic `RuntimeKernel`／in-memory scaffold 與 Visit draft runtime 已刪除 | CodeGraph 查無 `RuntimeKernel`；commits `d524d5a`、`8216f33` | 禁止在第一個真實 consumer 前重建平台 |
| F-07 | canonical Agent identity compatibility foundation 已存在；`AGENTS` 仍維持 legacy-compatible projection | `src/lib/agent-data.ts`、`src/modules/agents/identity.ts` | 全面 consumer cutover 改為需求觸發，不作固定前置工作 |
| F-08 | `.env.local` 只有 `AUTH_SECRET`、`ADMIN_PASSWORD`、`APP_BASE_URL` | key-name-only inventory | 可驗 auth；不能驗 Supabase 或 provider journey |
| F-09 | 最後完整自動驗證為 95 test files／473 tests、typecheck、lint、build；Playwright smoke 132／132 | commits `5fc13ec`、`a979489` | 只證明 contract／test-env render continuity，不是 real-data acceptance |

### Current source map

每個實作批開始前仍須用 CodeGraph 重驗；本表是 cold-start 索引，不取代 live caller map。

| Domain | UI／entrypoints | Current owner | Data／provider boundary | Current evidence |
|---|---|---|---|---|
| Auth | `/login`、auth routes、`proxy.ts` | `src/modules/auth/auth.ts`＋`src/lib/auth.ts` | signed cookie、auth env | real form login/logout verified；無資料庫依賴 |
| Operations | `/goals`、`/todos`、`/subscribers`、`/outputs`、`/tv` 與相關 APIs | `modules/{goals,checklist,subscribers,operations}` | `adapters/{goals,checklist,subscribers,operations}`；主 Supabase | structure/contract/render done；real DB blocked |
| Knowledge Base | `/knowledge-base{,/import}`、KB／cron APIs | `modules/knowledge-base/*` | `adapters/knowledge-base/*`；主 Supabase／Firecrawl／OpenAI | structure/contract/render done；schema drift＋provider blocked |
| Meeting | `/meeting`、9 個 Meeting APIs | `modules/meeting/{session,audio,conversation,realtime}.ts` | `adapters/meeting/*`；主 Supabase／Storage／OpenAI | structure/contract/render done；voice/data journey blocked |
| Visit／Coco | LINE webhook、timeout、research、AI、public respond APIs；Visit／TV／Outputs | `modules/visit/*` | `adapters/visit/*`；主 Supabase／LINE／Google／OpenAI | ownership substantially consolidated；real event/data/recovery blocked |
| Orders／Reporting／Support | Teachify webhook、cron/manual reports、Support relay/callback | `modules/{orders,reporting,support}` | `adapters/{orders,reporting,support}`；主 Supabase與外部 providers | structure/contract/render done；delivery/retry evidence blocked |
| Agent identity／chat／TV | dashboard、Agent pages、TV、agent-chat API | `modules/{agents,agent-chat,live-task,tv}`＋`src/lib/agent-data.ts` | Agent／chat／live-task adapters；static roster＋主 Supabase | compatibility foundation done；全面 cutover deferred |
| Teaching pipeline | Operations page、Meeting/chat live context | `src/lib/teaching-system.ts` | **獨立 teaching Supabase** | 四張表無 repo migration provenance；real data blocked |

### Progress by evidence dimension

| Area | Ownership／structure | Contract | Render／auth | Real data／provider | Next trigger |
|---|---|---|---|---|---|
| Auth | Done | Done | Functionally verified | N/A | auth 行為改變時重驗 |
| Operations | Done | Done | Render smoke | Blocked | 取得主 Supabase 後跑 CRUD journeys |
| Knowledge Base | Done | Done | Render smoke | Blocked | 先關 schema/RPC drift，再跑 ingestion/search |
| Meeting | Done | Done | Render smoke | Blocked | 有 staging／OpenAI 後跑完整 session |
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

- Source 共引用 32 個 Supabase table name；其中主系統 28 個、teaching project 4 個。
- Local repo 有 7 份 migration：建立 13 張表；`contacts`、`knowledge_base` 只有 `ALTER`，沒有 base `CREATE`；另有 13 張主系統 legacy table 沒有 base DDL。
- Teaching project 的 `projects`、`project_sessions`、`enterprise_inquiries`、`quotations` 是獨立資料庫，repo 內沒有其 migration。
- Source 使用 RPC `match_kb_chunks`，repo migration 沒有建立該 function。
- `kb_sources` source 另使用 `url`、`source_type`、`content_hash`、`last_checked_at`；local migration 沒有這些欄位。
- `kb_chunks` source insert `title`、`source_page`、`embedding`；migration 的欄位契約不完整相容，不能先假設 production schema 等同 repo SQL。
- `fanstudents/kv` 檢查快照 `98bcafc` 比 local 多 `20260730_runtime_hardening.sql`，但仍只有增量 migration，且直接依賴既有 `ai_usage_logs`／`agent_*` tables；它是 delta reference，不是 clean-rebuild baseline。

### Missing provenance

| Project | Missing／partial schema truth | Consequence |
|---|---|---|
| Main Supabase | `contacts`、`knowledge_base` 只有 alter；`agent_goals`、`ai_usage_logs`、`broadcast_logs`、`checklist_status`、`contact_profiles`、`knowledge_access`、`line_*`、`pending_invites`、`visit_offers` 無 base DDL；KB RPC/columns drift | 不能 clean rebuild、驗證 query 或安全設計 migration |
| Teaching Supabase | `projects`、`project_sessions`、`enterprise_inquiries`、`quotations` 無 repo migration | Operations／Meeting/chat pipeline 無真實資料基線 |
| Providers | LINE／OpenAI／Google／Teachify／Firecrawl key或安全 fixture尚未提供 | 不能把 mock/empty UI 升級成 production-like evidence |

### Resolution package DB-01

**Owner／input:** CabLate／原作者提供兩個正確 Supabase project 的 read access 或 schema-only dump；不需要 production rows、個資或 secret 落入 Git。

**Required evidence:**

1. Main 與 Teaching 各自的 tables、columns、PK/FK、indexes、extensions、RLS/policies、functions/triggers，以及相關 Storage bucket metadata。
2. project identity 只記 class／reference，不把 key 或 dump 中的敏感內容提交。
3. source query、local 7 migrations、`fanstudents` 第 8 份 delta 與 actual schema 的差異表。
4. 由 actual schema 建立 baseline 後，在空白 local／staging 重播 migration；先修 dependency 與 KB RPC/column drift。
5. Supabase Data API exposure、grant 與 RLS 依該 project 的實際設定驗證，不預設新表一定 exposed 或 hidden。

**Blocks:** schema change、runtime repository、real DB CRUD、KB ingestion/search、provider-backed journey、production cutover。

**Fallback:** 未取得前只允許不依賴 schema 猜測的 feature／pure-domain／contract工作，整體 verdict 保持 Needs Revision。

## 6. Execution tracks and active TODO

### Work graph

```text
WP-00 Current-state／plan reset（完成）

WP-F Feature lane（隨時可執行）
  └─ affected baseline → 最小需求實作 → touch-and-migrate → affected evidence

WP-DB Database/environment truth（等待外部 input）
  → WP-B Real functional baseline
      → WP-D Demand/risk-driven domain slice
          → WP-R Shared reliability primitive（只有第二 consumer 證明時）
              → WP-X Cutover／cleanup
```

WP-F 可以與 WP-DB 並行。WP-DB 只阻塞 data/provider/schema 相關驗收與 cutover，不阻塞所有需求或純結構修正。

| WP | Outcome | State | Depends on | Produces／next gate |
|---|---|---|---|---|
| WP-00 | 現況、版本、映射、依賴與完成維度重新可信 | Complete | none | 本文件與 current source map |
| WP-F | 新需求在現有產品可持續交付，並局部改善被碰到區域 | Ready／ongoing | affected source preflight | feature evidence；可能觸發 WP-D |
| WP-DB | 兩個 Supabase 可重建且 schema provenance 清楚 | Blocked on external input；acquisition action ready | project access或schema-only dump | baseline migration／rehearsal／env identity |
| WP-B | 核心 journey 有 real-data/provider-safe baseline | Pending | WP-DB＋provider fixture | 可比較的 before behavior與failure map |
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

### WP-B — Core functional baseline

取得 WP-DB 後，依實際需求優先順序驗證，不要求同一天完成所有 domain：

- Auth：login→protected page→logout。
- Operations：Goals／Todos／Subscribers 的代表性 read/write。
- Knowledge Base：CRUD→import/crawl→publish→index/search；含 failure。
- Meeting：start→command/voice→turn→finish／recording。
- Visit：LINE fixture／sandbox 的 text、waiting、offer/invite、timeout；含 duplicate與failure。
- Orders／Reporting／Support：webhook、manual/cron、delivery failure與callback/relay。

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
- compatibility window與reconciliation完成。
- shim、flag、shadow/dual-write、dead schema/code/test/dependency已刪或有明確保留決策。
- README／本文件與CodeGraph指向新owner。
- 另一位工程師能依env/runbook重跑release與rollback。

## 8. Traceability and readiness

| Goal | Requirements／invariants | Work packages | Outcome evidence |
|---|---|---|---|
| G-01 | R-01～R-04 | WP-F、WP-D、WP-X | 新需求局部交付、owner明確、可回退 |
| G-02 | I-01、I-02、I-04 | WP-F、WP-B、WP-X | affected functional＋visual parity |
| G-03 | I-03、I-04 | WP-DB、WP-B | 兩個 DB baseline、env identity、real journey |
| G-04 | R-01、R-02 | WP-F、WP-D | CodeGraph owner/caller與contract evidence |
| G-05 | R-02、R-04 | WP-D、WP-R | 第二 consumer或真實可靠性需求 |
| G-06 | R-03 | WP-X | production-like、rollback、legacy deletion |

### Verdict: Needs Revision

**整體 blocker:** Main／Teaching Supabase 的 actual schema與測試環境尚未取得；這會改變 migration、KB contract、資料驗證與任何 runtime persistence決策。

**現在可執行:** WP-F 的真實需求與不依賴 schema猜測的局部改善；DB-01 的取得／introspection工作。一律先重驗 affected source，不再繼續無需求支撐的全域抽象整理。

**被阻塞:** clean rebuild、real DB/provider journeys、schema/runtime cutover與 production-like Done。

**升級條件:** WP-DB 關閉後，至少完成當前高優先 domain 的 WP-B baseline；其餘 domain可保持待需求觸發，不要求先搬完整個系統。

## 9. Documentation policy

- 本文件是唯一 live plan、TODO、現況索引與 readiness verdict。
- 完成批次只在 ledger 保留一行 outcome＋代表 commit；詳細 evidence由Git、tests、Playwright artifacts或DB query保存。
- Live symbol mapping由CodeGraph重驗；本文件只保留cold-start所需的stable owner path。
- 不建立route-level Markdown、micro-checkpoint、每日流水帳或另一份runtime／migration roadmap。
- 文件每次更新都移除過期snapshot、已完成細節與不再改變決策的段落；單一文件不等於可以無限制增長。
