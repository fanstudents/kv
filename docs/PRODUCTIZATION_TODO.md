# KV 產品化重構執行計畫

> 這是唯一的 Plan／TODO／進度表／domain migration register。
> 現況量化證據見：[重構效能與有效性稽核](./refactor-effectiveness-audit-2026-07-31.md)。

## Plan identity

| Field | Value |
|---|---|
| Lifecycle | Active |
| Profile | Migration |
| Release intent | Production slices；不做 big-bang rewrite |
| Owner | CabLate 工程團隊 |
| Repository | `F:/ownproject/kv` |
| Branch／snapshot | `codex/kv-wp0-toolchain`／`f866340` |
| Merge base | `359d4c98035267df2711a376a439fdbc5720cc76` |
| Last verified | 2026-07-31；CodeGraph index 402 files／3,395 nodes／7,030 edges |
| Requirements source | 本對話：產品化、UI／UX 不變、沿用現有資料格式、可維護可擴充 |
| Known drift | 本計畫之後若 route、schema、public contract、runtime owner 或測試入口有變，開工前重跑 CodeGraph preflight |
| Readiness | **Needs Revision**；runtime schema 選型已收斂，但真實環境與 legacy schema provenance 尚未關閉 |

## 1. Outcome and scope

### Outcome

工程團隊能在不改變既有 UI／UX 與外部行為的前提下，可靠地理解、修改、測試與擴充 KV；每個業務能力只有一個 owner，Agent 能由角色、workflow、tools、runtime 與 presentation 組合，而不是複製 route 或寫死整條流程。

### Final success evidence

- 核心後台 journey 能在 authenticated、real-data 或明確 production-like 環境重複執行。
- UI URL、文案、DOM、responsive、loading／empty／error state 與操作結果沒有非預期差異。
- route 只處理 transport；業務規則、orchestration、repository 與 provider ownership 可由 CodeGraph 證明。
- runtime 已被至少兩條不同 execution profile 的 production flow 重用，不是無 consumer 的 framework。
- migration 有 parity、cutover、rollback、reconciliation 與 legacy deletion evidence。
- production code 的薄抽象與重複 owner 明顯減少，且每個保留的 port／adapter 都有可說明的替換邊界。

### In scope

- Authenticated baseline、schema／env inventory 與測試證據校正。
- 現有 `modules`／`adapters`／`lib` 的 domain consolidation。
- Visit、Meeting、Knowledge Base、Orders、Reporting 的漸進 cutover。
- 既有 runtime persistence 與目標 canonical runtime persistence 的 reconciliation；不保留未被正式 consumer 證明的 scaffold。
- Agent definition／instance／execution／presentation owner 整理。
- Frozen UI 的 read projection cutover。
- Production-like acceptance、legacy cleanup 與最終文件收尾。

### Non-goals

- NG-01：不重寫前端、不重新設計 UI／UX。
- NG-02：不另開空白專案做第二套產品。
- NG-03：不為「未來也許會用」先建立 framework、port、adapter 或資料表。
- NG-04：不在沒有 backward compatibility 與 rehearsal 前改既有 payload／schema。
- NG-05：本階段不做一般性 security scan；但 auth、secret、RLS 等既有邊界不得被弱化。
- NG-06：不以 route 數、commit 數、文件數或測試數量當作完成度。

## 2. GORE core

### Actors and intent

| Actor／consumer | Job／outcome | Current pain／risk | Product intent |
|---|---|---|---|
| CabLate 工程團隊 | 安全接手、修改、擴充、除錯與 release | ownership 分散、薄抽象暴增、缺真實功能證據 | 將 Dennis 的作品變成長期可維護產品 |
| 後台操作者 | 以原本畫面完成管理、會議、知識庫、Visit 等工作 | backend 改動可能靜默破壞資料或互動 | 重構期間與完成後操作行為不變 |
| 外部系統／事件來源 | LINE、Teachify、cron、Google、OpenAI 等可重送且可追溯 | failure、retry、duplicate 與 delivery ownership 不一致 | 流程具備冪等、恢復與可觀測性 |
| 後續開發者 | 能新增 Agent／workflow／provider 而不複製整套 code | Agent、事件、流程與展示資料混合 | 以清楚模型與共享能力組合擴充 |

### Goal model

| Goal ID | Type | Goal | Observable outcome |
|---|---|---|---|
| G-01 | Primary | 工程團隊能以可預測成本安全擴充 KV | 新功能能找到唯一 owner、建立高訊號測試並局部 release |
| G-02 | Continuity | 重構期間既有產品能力持續可用 | authenticated journeys、API contract、UI visual parity 持續通過 |
| G-03 | Supporting | 建立可信的功能證據 | render smoke 與 functional／production-like evidence 被分開記錄 |
| G-04 | Transition | 每個 domain 從多重 legacy owner 收斂成一個 owner | CodeGraph 無重複 orchestration、純 alias adapter 與 route-specific 四件組 |
| G-05 | Supporting | runtime 由真實垂直流程驅動形成 | 至少兩種 execution profile 共用 persistence／idempotency／outbox 能力 |
| G-06 | Cutover | 新 owner 可受控接管流量與資料 | shadow／parity／feature flag 或直接可回退切換的 evidence 達標 |
| G-07 | Cleanup | transitional code 不永久化 | legacy caller 歸零，shim／flag／重複 schema／dead tests 被刪除 |

### Requirements and invariants

| ID | Type | Requirement／invariant | Evidence |
|---|---|---|---|
| I-01 | UI invariant | URL、文案、DOM、視覺、responsive、操作順序與 UI state 不變 | authenticated before/after interaction + visual evidence |
| I-02 | Data invariant | 現階段沿用 Dennis 的 payload 與既有 Supabase 格式 | contract tests、mapper tests、schema rehearsal |
| I-03 | Auth invariant | 不移除登入牆；公開 route、webhook、cron 規則維持現況 | negative auth tests + real login evidence |
| R-01 | Environment | `.env.local` 能重現登入、Supabase 與必要 provider | env key presence、server identity、journey result |
| R-02 | Ownership | 一項 business behavior 只有一個 owner | CodeGraph impact／caller map |
| R-03 | Abstraction | port／adapter 必須有多 consumer、provider、transaction 或實質 translation 理由 | boundary allowlist + review |
| R-04 | Verification | 每批依風險通過 static、unit、integration、functional、visual 或 production-like evidence | verification ledger |
| R-05 | Migration | 新舊共存需有 compatibility window、reconciliation、cutover、rollback、cleanup | migration gates |
| R-06 | Maintainability | consolidation 預設減少檔案與 owner；增加時需提出可量化理由 | before/after file、LOC、consumer delta |

## 3. Verified current state

以下 Fact 以 `996a4e0` 為 snapshot；Requirement、Decision 與 Unknown 不混作 Fact。

| ID | Fact | Stable anchor | Planning impact |
|---|---|---|---|
| F-01 | API 有 56 個 `route.ts` | `src/app/api/**/route.ts` | route 是 compatibility surface，不應按 route 建 architecture |
| F-02 | `src/modules` 197 files、`src/adapters` 72 files；其中 144 files 不超過 15 行 | 以 `rg --files` + line count 重跑 | 需要 domain consolidation，不再新增四件組 |
| F-03 | `runGoalsRead`、`runChecklistRead`、`runSubscribersRead`、`runKnowledgeBaseRead` 都只有 route production caller | CodeGraph `impact <symbol> --depth 2` | 這些 interface/application 預設進 collapse list |
| F-04 | 已移除沒有 production caller、只有專屬 unit tests 的 generic `RuntimeKernel`／in-memory scaffold | CodeGraph caller／impact map；正式 runtime 仍在 `agent-runs.ts`／`visit-run.ts` | 禁止先擴寫或重建 generic runtime |
| F-05 | `agent_runs`、`agent_run_steps`、`agent_artifacts` 已有 migration 與 Supabase helper；Visit 已透過 `visit-run.ts` 使用 | `20260725_agent_runtime_core.sql`、`agent-runs.ts`、`visit-run.ts` | 新 kernel 必須與現有 schema／behavior reconciliation |
| F-06 | 目標 runtime 需要 workflow/deployment/correlation/version 等欄位，既有 `agent_runs` schema 使用 agent_slug/trigger/status/meta；WP-04 field map 證實不足 | WP-04 field map vs runtime migration | D-08 選擇既有 run 相容 + additive runtime extension；不可只塞 `meta` 或直接套 generic kernel |
| F-07 | `AGENTS` 影響至少 76 個 CodeGraph symbols；catalog、TV、runtime profile 又各有不同 Agent shape | `agent-data.ts`、`agent-catalog.ts`、workflow contracts | Agent model 不能直接一次替換 |
| F-08 | UI 已直接 consume 多個 API；Visit、Meeting、KB 是高互動面 | UI `fetch("/api/...")` consumers | backend work 必須驗證受影響 UI，不只 catalog |
| F-09 | E2E 有 public/protected/API/visual smoke，但 protected access 使用 synthetic signed cookie | `tests/e2e/**` | 現有證據不是 real login／real-data functional E2E |
| F-10 | repo 沒有團隊可用的 `.env.local`；`.env.example` 已存在 | `.env.example`、`.gitignore` | WP-01 是第一個 execution gate |
| F-11 | migrations 沒有建立所有被 code 使用的 legacy tables | `supabase/migrations/**` 對照 `.from(...)` | clean rebuild 的 schema provenance 是 Unknown |

### Key architecture finding

```text
目前 production Visit
LINE route
  → Visit applications
  → legacy runtime adapter
  → visit-run.ts
  → agent-runs.ts
  → existing Supabase agent_* tables

已移除的 platform runtime draft
RuntimeKernel / generic workflow / tool contracts
  → InMemory repositories
  → unit tests only，沒有 production caller
```

目標不是讓兩套永久共存，也不是丟掉已運作的 schema。D-08 已決定以 compatibility mapper／repository 將既有 production path 收斂到 canonical runtime，並只為 event／CAS／lease／outbox 補 additive persistence；實作延後到有真實 consumer 的 WP-05/08。

## 4. Architecture rules

### Keep allowlist

符合至少一項才保留獨立 boundary：

- 多個 production consumer 共用。
- LINE／OpenAI／Google／Teachify／Supabase 等外部 provider。
- transaction、idempotency、lease、CAS、outbox、retry、replay 或 reconciliation。
- 有實質 payload／row／error translation。
- 必須獨立替換、sandbox、觀測或 rate-limit。
- application service 明確協調多個 side effects、等待或 failure branch。

### Collapse list

- application 只有 `return port.method(input)`。
- 單一 consumer、單 method 且無替換理由的 interface。
- adapter 只有 `{ method: existingHelper }` 或純 alias。
- 同一 CRUD resource 依 HTTP method 切成多套 rules／ports／application／adapter。
- route、application 與 legacy helper 同時擁有相同行為。
- 測試只重複驗證 forwarding 或 fixture 欄位存在。

### Target responsibility

| Layer | Owns | Must not own |
|---|---|---|
| Route／transport | auth、parse、HTTP status、response mapping | business policy、DB query、provider orchestration |
| Domain | entity/value、invariant、decision policy | HTTP、Supabase row、provider SDK |
| Application／workflow | use case、step ordering、failure／wait／handoff | SDK details、UI presentation |
| Repository／provider adapter | persistence/provider translation、transaction/resilience | business branching、route response |
| Runtime | run/event/step/artifact/outbox state與恢復 | Agent 銷售展示、任一 domain 特例 |
| Projection | read model 與 UI-compatible mapping | write-side business truth |
| Presentation | frozen UI state 與 interaction | runtime/database ownership |

## 5. Domain migration register

這張表取代逐 route source map。每個 work package 開始前要用 CodeGraph 重驗該列，不能只相信文件。

| ID | Current source／consumers | Data／providers | Target owner | Keep／collapse／delete | Cutover／deletion gate |
|---|---|---|---|---|---|
| DM-01 Auth／routing | `proxy.ts`、`lib/auth.ts`、login/logout routes、login/Sidebar | signed cookie；`AUTH_SECRET`／`ADMIN_PASSWORD` | shared auth policy + session adapter | 保留 guard；合併無價值 login四件組；不做 bypass | real login、wrong password、expired/missing cookie、public/protected matrix 通過 |
| DM-02 Operations CRUD | goals/checklist/subscribers/contacts/activity routes；dashboard/todos/subscribers/outputs/TV consumers | `agent_goals`、`checklist_status`、`line_subscribers`、`contacts`、`line_agent_activity` | 少量 Operations domain services + shared repositories | 合併 read/write route四件組；保留 broadcast、tag 等真實 multi-side-effect use case | API payload parity + authenticated UI operations；CodeGraph 無純 forwarding owner |
| DM-03 Knowledge Base | KB CRUD/import/crawl/reindex/access routes；KB pages | `knowledge_base`、`knowledge_access`、`kb_sources`、`kb_chunks`、`kb_citations`；Firecrawl/OpenAI/Supabase | KB domain + ingestion/search services + repository/provider adapters | 合併 39 modules/13 adapters 的 action slices；保留 upload/crawl/index provider與transaction邊界 | CRUD/import/publish/crawl/reindex functional journeys、row parity、failure recovery；legacy helpers caller 歸零 |
| DM-04 Meeting | 9 meeting routes、meeting page、TV command | `meetings`、`meeting_turns`、recording storage；OpenAI realtime/audio | Meeting session domain + realtime/audio/storage adapters | 合併 route-specific start/finish/log/speak/transcribe四件組；保留 session orchestration與provider adapters | start→command/voice→turn log→finish journey，recording failure/retry，UI parity |
| DM-05 Visit／Coco | LINE webhook、visit APIs、timeout cron；visit page、outputs、TV/live task | contacts、offers、invites、locks、runs/artifacts/live task；LINE/OpenAI/Google | Visit domain workflow on canonical runtime | 保留 offer/invite/text/image/postback side-effect ordering；合併重複 workflow/runtime ports與alias adapters | 先 text vertical slice，再 image/offer/approval/timeout；shadow compare、duplicate/retry、delivery receipt、legacy caller=0 |
| DM-06 Orders／Ray | Teachify webhook、test notification、orders page | `teachify_orders`、activity、agents；Teachify/LINE | Orders inbound workflow + order repository + delivery adapter | 保留 normalization/idempotency/notification orchestration；刪除 test-only legacy ownership | duplicate webhook、invalid signature/payload、partial delivery、outbox/replay evidence |
| DM-07 Reporting／Vivian／Support | cron/manual report routes、support relay/log；dashboard actions | agents/activity/support conversations/subscribers；OpenAI/LINE/relay target | Reporting schedule workflow + artifact/delivery；Support inbound workflow | 合併 cron/manual重複；保留 schedule dedupe、report generation、relay provider | same-period dedupe、artifact parity、delivery receipt、provider failure/retry |
| DM-08 Runtime／workflow | `agent-runs.ts` production helper、Visit legacy runtime adapter；已移除的 generic in-memory scaffold | existing agent_* tables；target additive runtime tables | 有第一個真實 consumer 時才建立 canonical runtime transaction/repository | 先 reconciliation，不重建空泛 contract；最終刪除 direct DB helper或讓它成唯一 compat adapter | schema mapping決策、Supabase repository、restart/resume/idempotency/outbox；兩種 profile production consumers |
| DM-09 Agent model | `agent-data.ts`、`agent-catalog.ts`、DB `line_agents`、workflow execution profiles、TV/page local shapes | static TS + `line_agents` | RoleTemplate／AgentInstance／ExecutionProfile／Presentation；public catalog 保持獨立 input 直到有真實 consumer | 先 mapper 不改 UI；逐 consumer cutover；最後刪除重複 truth | catalog/dashboard/TV/meeting parity；新增 Agent 不需複製 route；old owner caller=0 |
| DM-10 UI projections | dashboard、flow、TV、universe、meeting、agent pages 與各 API loaders | activity、runs、live task、KB、agents等多源資料 | stable read projections | 保留 frozen components；只改內部 data source/mappers | 每 surface authenticated before/after、loading/empty/error/data、desktop/mobile visual parity |

## 6. Decisions, assumptions and unknowns

### Decisions

| ID | Decision | Reason／consequence |
|---|---|---|
| D-01 | 在原 repo 漸進重構 | 保留行為與 Git history，避免雙系統漂移 |
| D-02 | 單一 TODO；tests 與 CodeGraph 承擔 contract／source map | 避免文件再次按 route 膨脹 |
| D-03 | 不移除登入牆 | 它是原產品邊界；本機問題用 env 解決 |
| D-04 | domain-first、vertical-slice runtime | 抽象必須由真實 consumer 證明 |
| D-05 | 先做 Operations consolidation pilot | 低風險驗證新的模組粒度，再碰 KB/Meeting/Visit |
| D-06 | 沿用現有資料格式；schema 只做 additive/backward-compatible change | 降低不可逆 migration 風險 |
| D-07 | 真實 UI 驗證依 affected surface，不用 catalog 取代後台功能 | browser evidence 要能證明受影響 journey |
| D-08 | Runtime 採「既有 `agent_runs` 相容列 + additive runtime fields／event／outbox tables」 | 只靠 mapper 不能提供 event durability、CAS、lease 與 delivery receipt；不另建第二張 run table，也不把 `agent_tasks` 假裝成 outbox。具體欄位與 cutover contract 見 WP-04。 |

### Assumptions

| ID | Assumption | Recheck point | If wrong |
|---|---|---|---|
| A-01 | 團隊可取得本機或 staging Supabase 與必要 provider credentials | WP-01 | 無法做 real-data evidence，計畫維持 Needs Revision |
| A-02 | 既有 API payload 與 table rows 是現階段 compatibility source | 每個 domain before baseline | 先由 owner 決定 intentional change，不在 refactor 偷改 |
| A-03 | UI freeze 可透過 mapper/projection 達成 | DM-09/10 cutover | 停止切換，回退 data source，另開產品決策 |

### Material unknowns／resolution

| ID | Unknown | Resolution package | Blocks | Success／fallback |
|---|---|---|---|---|
| U-01 | 可用 `.env.local`、Supabase project、fixture/staging 的真實狀態 | WP-01 | 所有 functional E2E與schema rehearsal | 取得環境；否則只允許 structural work並維持 Needs Revision |
| U-02 | legacy tables 的完整 canonical migration／schema provenance | WP-01 | clean rebuild與未來schema change | dump/introspection對照 migrations；缺口建 baseline migration，不猜 schema |
| U-03 | **已關閉（WP-04）**：新 RuntimeKernel 不能只映射既有 `agent_*` tables；採既有 run/artifact/step 相容 + additive runtime extension | WP-04 | 實作仍受 U-02 與真實環境驗收限制 | D-08；WP-05 才實作第一個 consumer，不先擴 generic framework |
| U-04 | LINE/OpenAI/Google/Teachify 是否有 sandbox 或可安全重播 fixture | WP-01 + 各 domain preflight | production-like provider verification | sandbox；否則 contract fixture + staging canary，明列 deferred evidence |

## 7. Work package DAG

```text
WP-00 plan repair（本批）
  → WP-01 environment + authenticated/schema baseline
      ├─→ WP-02 Operations consolidation pilot
      │     ├─→ WP-03 Knowledge Base consolidation
      │     └─→ WP-04 Runtime reconciliation
      │             → WP-05 Visit text vertical slice
      │                   → WP-06 Visit remaining cutover
      │
      ├─→ WP-07 Meeting consolidation
      └─→ WP-08 Orders + Reporting cutover

WP-05 + WP-07 + WP-08
  → WP-09 Agent model ownership
      → WP-10 Frozen UI projection cutover
          → WP-11 Production-like acceptance + legacy cleanup
```

| WP | Produces | Depends on | Serial integration point |
|---|---|---|---|
| WP-00 | executable canonical plan | none | TODO |
| WP-01 | reproducible env、authenticated baseline、schema inventory | WP-00 + credentials | `.env.local`／Supabase project |
| WP-02 | validated consolidation pattern | WP-01 | shared architecture rules |
| WP-03 | canonical KB owner | WP-02 | KB routes/repository |
| WP-04 | runtime schema/contract decision + repository plan | WP-01、WP-02 | runtime contracts/schema |
| WP-05 | first production runtime slice | WP-04 | LINE text routing/runtime |
| WP-06 | Visit cutover + legacy deletion | WP-05 | LINE webhook/timeout |
| WP-07 | canonical Meeting owner | WP-01、WP-02 | Meeting APIs/storage |
| WP-08 | Orders/Reporting production slices | WP-01、WP-02、WP-04 | webhooks/cron/outbox |
| WP-09 | canonical Agent model/mappers | WP-05、WP-07、WP-08 | Agent registry |
| WP-10 | UI read projections | WP-09 + relevant domain cutover | UI data loaders |
| WP-11 | canary、reconciliation、cleanup、final evidence | all | release/cleanup |

## 8. Work package TODO

### WP-00 — Plan repair and live migration register

**Goals:** G-01、G-04、G-07

**Status:** complete in this batch.

- [x] 用 CodeGraph 重驗 route→application consumers。
- [x] 建立 domain migration register。
- [x] 將 generic runtime foundation 改為 reconciliation + vertical slice。
- [x] 加入 GORE、DAG、unknown、cutover／cleanup gates。
- [x] 保持一份 canonical plan。
- [x] 驗證、commit 本批。

**Done when:** 新執行者能從 WP-01 開始，不需自行發明模組粒度或 migration 順序。

### WP-01 — Reproducible environment and behavior baseline

**Goals:** G-02、G-03

**Requirements:** R-01、R-04、I-01～I-03

**Anchors:** `.env.example`、`proxy.ts`、`lib/auth.ts`、`playwright.config.ts`、`tests/e2e/**`、`supabase/migrations/**`.

**狀態（2026-07-31）：** Auth 與 authenticated render baseline 已建立；real-data／schema baseline 因沒有可用 Supabase 而未完成。WP-01 不得標為 Done。

**Behavior contract**

- Entry points：`/login`、`/api/auth/login`、`/api/auth/logout`、`proxy.ts` 保護頁面。
- States：anonymous → authenticated → logged-out／expired；missing 或 wrong password 留在 anonymous。
- Invariants：未登入不得進 protected route；成功登入設定 session cookie；登出清除 session；不得用 synthetic cookie 取代真實表單證據；缺資料服務時不得把 fallback UI 宣稱為 real-data verified。
- Acceptance：wrong/missing 回 `401`；正確密碼回 `200` 並可進 dashboard；logout 後 dashboard redirect login；相同流程由 Playwright 真實表單測試重現。

- [x] 團隊建立 ignored `.env.local`；只記 key presence，不記 secret。
- [x] 記錄 server port、commit、Supabase project class（local/staging），避免環境漂移。
- [x] 用真實密碼完成 login／logout／missing/wrong password／protected-session lifecycle。
- [x] 登入 dashboard 並確認資料 source；目前多數為 static/fallback，未冒充 real-data evidence。
- [ ] 點過 Dashboard、Visit、Meeting、KB、Subscribers/Todos 的代表性讀寫或互動（已確認 authenticated render；寫入／資料結果待 Supabase）。
- [x] 建 browser evidence manifest：URL、viewport、data source、操作、結果、screenshot/DOM。
- [ ] introspect 實際 schema，對照 migrations 與所有 `.from("table")`；標出 missing provenance（已完成 static source/migration 差異，actual DB 待 credentials）。
- [x] 將 tests 分成 synthetic render smoke 與 authenticated functional suite。

**Environment/evidence ledger（不含 secret）**

| Item | Evidence | Level／result |
|---|---|---|
| Baseline | commit `f1d5878`；local server `http://localhost:3000`；`.env.local` 有 auth keys | Structurally verified |
| Supabase | 未設定 URL／role key；local Supabase container 不存在 | Unknown；real-data blocked |
| Real auth API | missing `401`、wrong `401`、correct `200`、logout `200`、logout 後 protected route `307 → /login` | Contract tested |
| Real browser auth | `/login` 實際填表 → `/dashboard`；登出 → `/login`；重新登入成功 | Functionally verified（auth only） |
| Authenticated pages | `/dashboard`、`/agents/visit`、`/meeting`、`/knowledge-base`、`/subscribers`、`/todos` 無 page error | Render smoke passed |
| Data source | dashboard 使用 static `AGENTS`；agent status 可 fallback；`activity/knowledge-base/subscribers/checklist` API 因缺 Supabase 回 `500` | Real-data 未驗證 |
| Static schema comparison | source 引用 32 tables；repo migrations 建立 13；19 個 referenced tables 無 repo migration provenance | Structurally verified；需 actual introspection |
| Automated auth | `tests/e2e/auth-flow.spec.ts` 以實際表單覆蓋 wrong、login、redirect、logout | Contract tested；desktop Chromium 2 passed |

Static comparison 找到的 19 個 migration provenance 缺口：
`agent_goals`、`ai_usage_logs`、`broadcast_logs`、`checklist_status`、`contact_profiles`、`contacts`、`enterprise_inquiries`、`knowledge_access`、`knowledge_base`、`line_agent_activity`、`line_agents`、`line_conversation_locks`、`line_subscribers`、`line_support_conversations`、`pending_invites`、`project_sessions`、`projects`、`quotations`、`visit_offers`。

**Verification**

- login/session API negative + positive checks。
- affected pages 無 page error；實際互動後 DB/API 結果一致。
- local schema rehearsal 能重建，或明確產出 U-02 缺口與 resolution branch。

**Rollback:** 不修改產品 behavior；若環境不可得，保留 Unknown，禁止宣稱 functional verified。

**Done when:** 新成員依 README 能登入同一資料環境，且 baseline 可重複。

#### 進場清理 — Auth route boundary

**Status（2026-07-31）：** structural cleanup complete（`Contract tested`）；這是同一個 Auth domain 的 internal consolidation，不是 auth policy 或登入牆變更。Chrome authentication lifecycle 仍留在跨批次集中驗收。

**Behavior contract (`behavior-contract/v1`, `auth.route-boundary`)**

- Scope：`POST /api/auth/login`、`POST /api/auth/logout` 的 body normalization、登入結果、cookie policy 與 helper composition。
- Non-goals：不改 `proxy.ts`、session token／password verification 演算法、`SESSION_COOKIE`／TTL、URL/method/status/payload、登入畫面或任何 UI/UX。
- CodeGraph evidence：`runLogin`、`runLogout`、`createLegacyLoginAdapter` 各只有一個 route caller；login port、rules、application、logout wrapper 與 adapter 沒有第二個 production consumer。
- Invariants：缺設定仍回既有 `500`；錯誤或空密碼仍回既有 `401`；成功仍只設定同一個 httpOnly/lax/30-day session cookie；logout 仍以相同 secure 判斷清除同一 cookie。
- Design：保留可注入的 login dependencies 以固定 success/failure contract，但把單一 caller 的 port、thin adapter、rules/application 檔案收斂為一個 named Auth boundary；route 是 composition root。
- Acceptance：parser、missing-config、wrong-password、success token、development/production logout cookie 與 route response 不變；full automated verification 後才宣告 `Contract tested`，Chrome auth lifecycle 留在跨批驗收。
- Intentional changes：只有檔案/owner/import path；不更動認證能力或資料流。

**Evidence（2026-07-31）：**

- 將 5 個 Auth modules 加 1 個只轉傳 helper 的 adapter 收斂為 `modules/auth/auth.ts`；兩個 route 保持 composition root，未把 token/password 演算法帶進 UI 或改到 proxy。
- CodeGraph sync 後 `runLogin` 仍只由 login `POST` 呼叫，`buildLogoutCookiePolicy` 仍只由 logout `POST` 呼叫；舊 port/rules/application/adapter/import 搜尋為零。全 repo 為 408 files／3,417 nodes／7,084 edges。
- `npm test` 94 files／465 tests、`npm run typecheck`、`npm run lint`、`npm run build`、`git diff --check` 全數通過。5 個 dedicated unit files 收斂為 1 個 boundary test；保留 6 個可觀察行為案例，移除 2 個只驗證 thin adapter／永遠成功 wrapper 的 tests。
- [x] 保留可注入 login dependencies 與所有 route-visible success/failure/cookie contract。
- [ ] 在後續跨批次 Playwright/Chrome 驗收中重跑真實 login → dashboard → logout lifecycle；本批沒有 UI source change。

### WP-02 — Operations consolidation pilot

**Goals:** G-01、G-03、G-04

**Anchors:** `modules/{goals,checklist,subscribers,contacts,activity}`、對應 adapters/routes/UI。

**狀態（2026-07-31）：** Structural consolidation 已完成；real-data functional acceptance 因 WP-01 缺 Supabase 而未關閉，WP-02 尚不得標為 production-like Done。

- [x] CodeGraph 建 consumer map與 boundary allowlist/collapse list。
- [x] Goals 收斂 read/update/delete/reset/history 到單一 domain service + repository。
- [x] Checklist 收斂 read/update。
- [x] Subscribers 收斂 read/update，broadcast 保留為 application use case。
- [x] Contacts/Activity 建共享 repository/read model，不複製 query port。
- [x] route 只保留 parse/auth/HTTP mapping。
- [x] 刪除 forwarding applications、single-consumer ports、alias adapters與低訊號 tests。
- [x] 記錄 pilot 的 production files/LOC、owner、consumer before/after。

**Goals pilot evidence（2026-07-31）**

| Measure | Before | After | Result |
|---|---:|---:|---|
| Production owners | 19 files／279 LOC（13 modules + 5 alias adapters + 1 server helper） | 3 files／196 LOC（rules + service + Supabase repository） | -16 files／-83 LOC |
| Unit tests | 13 files／281 LOC | 3 files／294 LOC | -10 files；+13 LOC 換成實際 row mapping、error/query semantics，不再測薄轉呼叫 |
| Production consumers | 五個 application function 各自只有一個 route caller | `createGoalsService` 由 `/api/goals` 與 `/api/goals/history` composition 使用 | domain owner 單一化 |
| Dead owner scan | 10 個 forwarding application／alias adapter symbols | CodeGraph sync 後全部 0 live result | cleanup passed |
| Authenticated API parity | baseline／after：login `200`、invalid PUT `400`、missing DELETE id `400`、missing history metric `400`、無 Supabase GET `500` | status sequence exact match | Contract tested；real DB write 仍 blocked |
| Authenticated UI parity | commit `86a5f58` 舊版與 working tree 新版實際登入 `/goals` | DOM snapshot 均 11,042 chars 且 exact match；無 page error | Render smoke passed；UI/UX 未變 |

**Checklist slice evidence（2026-07-31）**

| Measure | Before | After | Result |
|---|---:|---:|---|
| Production owners | 7 files／96 LOC | 2 files／64 LOC（service + Supabase repository） | -5 files／-32 LOC；小 domain 不機械保留 rules 檔 |
| Unit tests | 5 files／132 LOC | 2 files／118 LOC | -3 files／-14 LOC；保留 projection、write chain、timestamp、error semantics |
| Consumers | read／update 各一個 route caller | 兩個 routes 共用單一 service/repository owner | forwarding owner 已移除 |
| Authenticated UI parity | 修改前後實際登入 `/todos` | DOM snapshot 均 6,550 chars 且 exact match；無 page error | Render smoke passed |
| API without data env | login `200`；read `500`；update `500` | 缺 Supabase 的既有 failure boundary 未被 fallback 掩蓋 | Real DB read/write 仍 blocked |

**Subscribers slice evidence（2026-07-31）**

| Measure | Before | After | Result |
|---|---:|---:|---|
| Production owners | 14 files／315 LOC（含 touch helper） | 4 files／249 LOC | -10 files／-66 LOC |
| Boundary | read/update 四件組；broadcast 三件組；touch alias adapter | CRUD service + Supabase repository；broadcast application + LINE adapter | broadcast fan-out/log 與 webhook touch 語意保留 |
| Unit tests | 9 files／363 LOC | 4 files／381 LOC | -5 files；+18 LOC 改測實際 touch create/update 與 provider failure |
| Dead owner scan | 6 個 forwarding／legacy symbols | CodeGraph sync 後全部 0 live result | cleanup passed |
| Authenticated UI parity | 修改前後實際登入 `/subscribers` | DOM snapshot 均 4,922 chars 且 exact match；無 page error | Render smoke passed |
| API without data env | login `200`；invalid update `400`；invalid broadcast `400`；read/logs `500` | validation 與缺 Supabase failure boundary 保持 | Contract tested；real fan-out／DB write 仍 blocked |

**Contacts／Activity slice evidence（2026-07-31）**

| Measure | Before | After | Result |
|---|---:|---:|---|
| Production owners | 9 files／124 LOC | 2 files／90 LOC（Operations service + Supabase repository） | -7 files／-34 LOC |
| Unit tests | 6 files／209 LOC | 2 files／167 LOC | -4 files／-42 LOC；保留 nested projection、filter order、tag write semantics |
| Boundary | Contacts read、Activity read、Contact tags 各自 ports/adapters | shared Operations read model；`ContactTagPort` 供 Visit/TV/Meeting 使用 | 多 consumer capability 保留，single-consumer query ports 移除 |
| Dead owner scan | 5 個 forwarding／legacy symbols | CodeGraph sync 後全部 0 live result | cleanup passed |
| Authenticated UI parity | 修改前後實際登入 `/outputs` 與 `/tv` | DOM snapshots 分別 8,488／1,441 chars 且 exact match；無 page error | Render smoke passed |
| API without data env | login `200`；contacts/activity/agent-activity `500` | 缺 Supabase failure boundary 保持 | Real data 與 tag write 仍 blocked |

**Verification:** focused rules/repository integration、API parity、authenticated Todos/Subscribers/Outputs/TV interactions、CodeGraph dead caller scan。

**Rollback:** 每個 domain 一個 commit；回退該 domain，不共用未驗證 global rewrite。

**Done when:** 這些 domain 無逐 route 四件組，檔案/owner 減少且功能證據不退步。此結果是後續 consolidation template。

### WP-03 — Knowledge Base consolidation

**Goals:** G-02、G-03、G-04

**Anchors:** DM-03 的 routes/modules/adapters、`lib/{knowledge-base,kb-import,kb-crawl,kb-search}.ts`.

**狀態（2026-07-31）：** 結構收斂完成，production-like acceptance 仍受 WP-01 credentials 阻擋。document repository、access policy、ingestion、crawl provider、index/search 均已有唯一 capability owner；Supabase schema、資料格式、API payload 與 UI 未改。

**Behavior contract (`behavior-contract/v1`, `knowledge-base.capabilities`)**

- Scope：`/knowledge-base`、`/knowledge-base/import`；`/api/knowledge-base{,/access,/import,/crawl,/reindex}`；`/api/cron/kb-recheck`；`knowledge_base`、`kb_sources`、`kb_chunks`；Firecrawl 與 embedding provider。
- Non-goals：不改既有畫面、route method/status/payload、資料表欄位、草稿/發布語意、權限等級、provider 選型。
- States：upload/crawl → source converting → draft preview → publish 或 discard → published docs 可 index；provider 失敗保留 failed/error 行為；網站內容變更只標記待複檢，不暗改已發布內容。
- Invariants：draft 不得進搜尋；只索引有 content 的 published docs；L1～L4 access 上限語意不變；內建示範文件仍不可刪；PDF 限 12MB 且只收 `.pdf`；Firecrawl quota error 仍映射既有回應；cron secret 行為不變。
- UI states：登入後兩頁的 first-paint、empty、ready、error、控制項與 responsive layout 都維持原樣；本機無真實 provider 時只驗證既有 zero/empty path，不宣稱 real-data journey 通過。
- Acceptance：文件 GET 同時回 `{ docs, access }`；POST/PATCH/DELETE 保留既有 validation/status；access PUT 僅接受 catalog slug 與 L1～L4；import GET 依 `sourceId` 回 sources 或 drafts；publish/discard 回原計數；crawl preview/import、reindex、recheck 保留成功與 provider failure contract。
- Evidence：capability unit tests、route/API tests、全套 Vitest/lint/typecheck/build；每個切片以 authenticated Chrome 對 `/knowledge-base` 與 `/knowledge-base/import` 做相同 DOM 與 console error 比對。真實 Supabase/Firecrawl/OpenAI journey 延後到 WP-01 credentials 補齊。
- Known acceptance gap：Chrome 實點「重建索引」在缺 Supabase env 時，route 因 `listKnowledgeDocs()` 的既有 fail-fast 行為回空的 `500`，前端顯示 JSON parse error。新舊 adapter 都委派相同 helper，但改前未留下這條 runtime baseline，因此不得把此 journey 宣稱為 regression-free；補齊 Supabase 後必須重跑。
- Intentional changes：只有 module/file ownership 與命名；observable behavior 無變更。
- Open question：缺少 Supabase migration provenance 的 runtime schema 仍由 WP-01/WP-04 處理，不在本批猜測或補 migration。

- [x] 依 capability 分成 document repository、access policy、ingestion、crawl provider、index/search。
- [x] 合併 CRUD/import action-specific ports與applications。
- [x] 將 Supabase rows、Firecrawl、embedding/OpenAI translation 留在 adapters。
- [x] 定義 upload→preview→publish/discard→index state/failure map。
- [x] 保持既有 API payload與KB頁面狀態。
- [x] legacy helper caller 歸零後刪除或降為唯一 adapter。

**Verification:** CRUD、access、upload、crawl、publish/discard、reindex integration journeys；bad file/provider failure；authenticated KB desktop/mobile parity。

**Rollback:** route-level compatibility façade 可回接 legacy owner，未完成前不改 schema contract。

**Done when:** KB capability 有唯一 owner，39 modules/13 adapters 不再按 route action 分裂。

### WP-04 — Runtime schema and contract reconciliation

**Goals:** G-03、G-05

**Status（2026-07-31）：** 設計決策完成，U-03 關閉；已移除沒有正式 consumer 的 generic runtime scaffold，沒有實作或假裝啟用新的 runtime。實際 migration／repository／cutover 仍受 U-02（legacy base schema 無法 clean rebuild）與真實 Supabase credentials 阻擋。

**Anchors:** `lib/agent-runs.ts`、`lib/visit-run.ts`、`20260725_agent_runtime_core.sql`、WP-04 target persistence slice.

**Behavior contract (`behavior-contract/v1`, `runtime.reconciliation`)**

- Scope：定義 `RunRecord`／`EventEnvelope`／`OutboxRecord` 與既有 `agent_runs`、`agent_run_steps`、`agent_artifacts` 的相容邊界；為 WP-05 Visit text 與 WP-08 Orders／scheduled report 指定最小 persistence slice。
- Non-goals：不改任何畫面、現有 route payload、既有 `agent_runs` 行為或資料；不建立 generic node/tool registry；不在 U-02 未解前手寫猜測的 legacy base migration。
- Entrypoints／consumers：現行 production 是 LINE webhook → `visit-run.ts` → `agent_runs`；`agent_run_steps` 同時供 Visit／TV live task 讀取；Orders webhook 與 Team Lead cron/manual report 尚未使用 canonical runtime。CodeGraph 已證實原 `RuntimeKernel`、`requestDelivery`、workflow/tool contracts 都沒有 production caller，因此已移除。
- Invariants：現有 `agent_slug`、`status`、`started_at`、`ended_at`、step／artifact UI 讀取語意不變；新 run 的 legacy status 是 canonical state 的相容投影；外部 provider 不在 DB transaction 中執行；duplicate event 不得生成第二個 run 或第二次 delivery。

#### Inactive platform runtime scaffold cleanup

**Status（2026-07-31）：** structural cleanup complete（`Contract tested`）；這是移除沒有 consumer 的死碼，不是 runtime migration 或 production cutover。Chrome cross-batch acceptance 仍留待集中驗收，不宣稱已完成 browser parity。

**Behavior contract (`behavior-contract/v1`, `runtime.inactive-scaffold-cleanup`)**

- Scope：移除 `src/platform/{runtime,events,artifacts,workflows,tools}` 的 generic contract／in-memory kernel，以及三個只驗證該 scaffold 的 dedicated unit tests；保留並聚焦 module import-boundary test。
- Non-goals：不改 UI／UX、route URL/method/status/payload、`agent_runs`／`agent_run_steps`／`agent_artifacts` schema、`agent-runs.ts`／`visit-run.ts` 行為、migration、provider 呼叫或 Agent identity。
- Entrypoints／consumers：CodeGraph 對 `RuntimeKernel`、`requestDelivery`、`InMemoryRuntimeRepository`、`WorkflowDefinition`、`ToolDefinition` 的 caller/impact map 只落在 scaffold 自身與 dedicated tests；沒有 production route、module、adapter 或 UI consumer。
- Inputs／outputs／side effects：正式流程沒有輸入、輸出或 side effect 經過此 scaffold；刪除不會改變正式 persistence 或外部 provider 呼叫。
- Invariants：未來 canonical runtime 必須仍遵守本節的 field map、transaction/outbox、U-01/U-02/U-04 gates；第一個真實 vertical-slice consumer 出現前，不可重新加入 generic framework。
- Acceptance：刪除後 `rg` 不得找到 `@/platform` import；CodeGraph 不得有遺留 production importer；full test/typecheck/lint/build/diff check 全過；本文件仍保留 target persistence decision。
- Intentional changes：刪除無效抽象與其專屬測試，並將剩餘 architecture guard 明確改為 product-module boundary；不宣稱 runtime persistence 已完成。
- Open questions：U-01、U-02、U-04 未關閉前，不能做真實 Supabase migration/rehearsal、provider replay 或 runtime production cutover。

**Evidence（2026-07-31）：**

- CodeGraph preflight：`RuntimeKernel`、`requestDelivery`、`InMemoryRuntimeRepository`、`WorkflowDefinition`、`ToolDefinition` 都沒有 production caller；impact 僅在 scaffold 自身與 dedicated tests。
- 移除後 `rg` 對 `@/platform`／`platform/` 在 `src`、`tests` 為零；CodeGraph 同步後為 417 files／3,447 nodes／7,129 edges，較前一批少 14 個解析檔。
- `npm test` 98 files／467 tests、`npm run typecheck`、`npm run lint`、`npm run build`、`git diff --check` 全數通過；相較前一批有意移除 3 個 dedicated test files／17 個只覆蓋死碼的 tests。
- [x] 刪除 generic runtime、event、artifact、workflow、tool scaffold 與其專屬測試。
- [x] 保留並更名 product-module import-boundary guard。
- [ ] 在後續跨批次 Chrome 驗收中，確認受影響正式頁面的 authenticated journey；本批沒有 UI source change。

#### Existing schema ↔ runtime field map

| Runtime contract | Existing source | Decision |
|---|---|---|
| `RunRecord.id` | `agent_runs.id` | 直接沿用。 |
| `agentInstanceId` | `agent_runs.agent_slug` | WP-09 前以 slug 做 compatibility mapping；新欄位保留真實 instance id，不能倒過來把 presentation slug 當 canonical identity。 |
| `workflowId`／`workflowVersion`／`deploymentId`／`correlationId` | 無實體欄位；部分 legacy context 在 `meta` | 新增實體 runtime 欄位；不能只塞 `meta`，否則查詢、CAS 與 replay 都沒有可驗證契約。 |
| `idempotencyKey` | `trigger_ref` + `(agent_slug, trigger_ref)` partial unique index | 舊索引保留作 legacy 相容；它不是 immutable event log，也不能取代 global event idempotency。canonical admission 由 event table 的 unique key 擁有。 |
| `state` | `status`: `running/success/failed/waiting/cancelled` | 新增 `runtime_state`。投影規則：`queued/running/retrying → running`、`waiting_input/waiting_approval → waiting`、`succeeded → success`、`failed/cancelled` 同名。 |
| `stateVersion`／`updatedAt`／`lease` | 無 | 新增 `state_version`、`updated_at`、`lease_owner`、`lease_expires_at`；CAS／claim 不能靠先讀後寫。 |
| `output`／`error.retryable` | `summary`、`error_kind`、`error_detail`；無結構化 output／retryable | 新增 `runtime_output jsonb`、`error_retryable`；`summary` 繼續是 UI 可讀摘要。 |
| `EventEnvelope` | 無；`agent_run_steps` 只有 node/status，不保存來源、payload 或 dedupe key | 新增 immutable `agent_runtime_events`；step 仍是 UI/telemetry，不冒充 inbound event ledger。 |
| `OutboxRecord` | 無；`agent_tasks` 是 Agent 委派佇列 | 新增 `agent_delivery_outbox`；不得重用 `agent_tasks`。 |
| `Artifact` | `agent_artifacts` | 直接沿用 `run_id`、`agent_slug`、title/version/content/uri/meta；只把明確產出寫成 artifact，不把每個 event 變 artifact。 |

#### Option decision

| Option | Result | Evidence-based reason |
|---|---|---|
| A. 已移除的 generic kernel 只 mapper 到既有表 | Rejected | 既有 schema 沒有 immutable event、CAS version、lease、outbox／delivery receipt；`startRun()` 先查後插且吞錯，race 時不能回傳同一 run。 |
| B. 既有 run/artifact/step 相容 + additive runtime extension | **Chosen** | 保住既有 UI 與歷史 row，又只為已排定的 Visit／Orders／Reporting consumer 補足 durable event、state 與 delivery 語意。 |
| C. 把 kernel 收斂成 legacy best-effort model | Rejected | 會放棄 duplicate、restart/resume、retry／outbox 這些產品化目標；也無法成為兩種 execution profile 的共享能力。 |

#### Target persistence slice and ownership

1. 擴充 `agent_runs`：`workflow_id`、`workflow_version`、`agent_instance_id`、`deployment_id`、`correlation_id`、`runtime_state`、`state_version`、`lease_owner`、`lease_expires_at`、`updated_at`、`runtime_output`、`error_retryable`。既有欄位與 history 不改，canonical repository 同時更新 runtime state 與 legacy `status` 投影。
2. 新增 `agent_runtime_events`：`run_id`、完整 envelope 欄位、`payload jsonb`、`idempotency_key unique`、時間戳；`admitRuntimeEvent` 必須在一個 DB transaction/RPC 內「建立或取回」同一 run，不能留下 orphan run。
3. 新增 `agent_delivery_outbox`：`run_id`、unique idempotency key、channel/destination/payload/artifact ids、state/attempt/available time/lease/error/audit timestamps。claim 必須以 DB-side lease／`SKIP LOCKED` 或同等原子操作完成；provider delivery 在 transaction 外執行。
4. `agent_run_steps` 繼續是流程圖／TV projection；`agent_artifacts` 繼續是可呈現產出；兩者不成為 state event 或 outbox 的替代品。
5. 已移除的 draft 曾把 transition 與 delivery enqueue 分離；WP-05 首次實作時必須只在有 Visit consumer 的前提下，補「state transition + outbox enqueue」的同交易 repository operation，避免 process 在兩者之間死掉。此刻不先新增未使用 interface。

#### Three execution-profile checks

| Profile | Current fact | Required canonical input／persistence | First owning package |
|---|---|---|---|
| Visit LINE text（long-lived resume） | `LineInboundEvent` 對 text 目前丟失 `message.id`；續跑靠 `agent_runs.meta.lineUserId` 找最近 active run，`visit_offers`／`pending_invites` 沒有可見 `run_id` link。 | 保留 text `messageId`，event key 用 `line:<messageId>`，correlation 用 `line:<userId>`；等待/續跑必須由 legacy business row 連到 canonical `run_id`，不是只靠「最近一筆」。 | WP-05（先做 text；image/offer/approval 仍留 WP-06）。 |
| Teachify Orders webhook（short-event） | `NormalizedOrder.id` 是 order entity，不必然是 webhook delivery/event id；目前 upsert order 後直接 push LINE，沒有 delivery receipt。 | 向 Teachify fixture／sandbox 確認 stable delivery id 與 event/refund type；不能只用 order id，否則付款後退款會被錯誤 dedupe。 | WP-08。 |
| Team Lead scheduled report（scheduled-batch） | cron 與 manual 都直呼同一 report function，沒有 run/artifact／period key。 | cron key 使用明確 business period；manual 使用新的 operator event key，兩者不互相 dedupe；成功報文本身存 artifact，delivery 走 outbox。 | WP-08。 |

#### Migration, rollback, and evidence gates

- 先關 U-02：本機 `npm run schema:rehearse` 實測在 `20260721_contacts_tags.sql` 因 `public.contacts` 不存在而失敗，尚未走到 `agent_runtime_core`。必須從實際 Supabase dump/introspection 補回 baseline provenance；不以 TypeScript 使用點猜表結構。
- U-02 關閉後，先用 CLI 建 migration、在 local DB 迭代，最後才生成／提交 migration history。新 table 同一 migration 內明確啟用 RLS、只授權 server-side `service_role` 所需權限，並撤銷 anon／authenticated；因 Supabase Data API 新表預設不再自動 expose，grant/RLS 是同一驗收項。
- Repository contract tests 必須對同一組 duplicate/CAS/lease/outbox cases 同時跑 in-memory 與 Supabase implementation；schema rehearsal、restart/reclaim、delivery failure/retry 失敗前不得切 production route。
- Rollback 只退 route/feature flag 到 legacy writer；additive columns/tables 與已寫資料保留可 reconciliation，不刪既有 `agent_runs`、steps、artifacts 或重送 external delivery。

**Acceptance examples:**

```gherkin
Given the same LINE text message is delivered twice
When the canonical Visit text handler admits both envelopes
Then exactly one canonical run and one immutable event exist
And the recipient receives at most one delivery for one delivery idempotency key

Given two workers transition one run from the same state version
When both attempt the compare-and-swap
Then exactly one transition persists and the other receives a stale result

Given the daily Team Lead cron retries the same business period after a provider timeout
When the outbox lease expires and a worker reclaims it
Then the existing report artifact is retried without creating a second scheduled run
```

- [x] 列出 existing schema ↔ `RunRecord/Event/Outbox` field map。
- [x] 比較 A mapper、B additive extension、C 收斂 kernel 三方案並選 B。
- [x] 以 Visit text、Orders webhook、scheduled report 三種 profile 驗證必要欄位與目前缺口。
- [x] 決定 idempotency、CAS/version、lease、outbox、event persistence 的最低 production slice。
- [x] 在本 TODO 更新 Decision、target map、migration/rehearsal與rollback。
- [x] 保持禁止 generic node kind、tool registry 或無 consumer schema。

**Verification:** CodeGraph caller/impact mapping 已完成；authenticated Chrome 已實看 Visit、Orders、Team Lead 並安全點擊收合/展開互動，無 console error/warn。local schema rehearsal 已執行且如上因 U-02 失敗；Supabase repository、restart、duplicate、CAS、outbox failure 的真實 DB 驗證明確保留給 U-02 後的 WP-05/08，不宣稱已通過。

**Done when:** U-03 的 schema／owner 決策已關閉，WP-05 實作者不需猜 mapper 或 minimum persistence；整份 plan 仍是 **Needs Revision**，直到 U-01/U-02 與 production-like evidence 關閉。

#### 進場清理 — Visit LINE ingress boundary

**Status（2026-07-31）：** structural cleanup complete（`Contract tested`）；這是 WP-05 前的 domain consolidation，不是 runtime cutover。它只消除同一條 Visit LINE workflow 的過細 ports／thin adapters，保留既有 event、payload、資料表、provider、side-effect 順序與畫面。Chrome cross-batch acceptance 仍待下一次集中驗收，不宣稱已完成 browser parity。

**Behavior contract (`behavior-contract/v1`, `visit.line-ingress.boundary`)**

- Scope：`POST /api/line/webhook`、`GET /api/cron/visit-timeout`，以及 Visit 的 inbound parse/normalize/fan-out、image/text/postback/offer/invite/timeout handler dependencies。
- Non-goals：不改 LINE signature 驗證、route URL/method/status/payload、`contacts`／`visit_offers`／`pending_invites`／`line_agent_activity`／`agent_*` schema、OpenAI/Google/LINE 呼叫、runtime state、UI/UX；不實作 EventEnvelope、outbox、migration 或 schema 猜測。
- Entrypoints／consumers：webhook `POST` 是 fan-out 的唯一 production caller；timeout `GET` 是 stale-offer application 的唯一 production caller；image/text/offer/invite/postback handlers 保留各自的實質 side-effect ordering。
- Inputs／outputs：原始 LINE body 仍 parse 成原 `LineInboundEvent[]`；同一 event 仍由 `Promise.allSettled` 隔離 failure；所有 existing port method signatures、legacy row mappers、route response 和 reply/push payload 不變。
- UI states：此批無 component 或 browser-visible data loader 改動；任何 UI evidence 僅檢查受影響既有 Visit/TV/Outputs read projection 未回歸。
- Invariants：`line-inbound.ts` 是 ingress normalization + dispatch 的單一 owner；`line-contracts.ts` 是 LINE workflow external contracts 的單一 owner；`legacy-line-adapters.ts` 只聚合同一 workflow 的 thin legacy translations，不承擔 business branching。
- Acceptance examples：缺 reply token 的 event 仍不觸發 handler；無 `source.userId` 的 text 仍使用 fallback user；一個 text handler 失敗時同 batch image handler 仍執行；timeout 的 stale offer query、resolve/tag/push/release 順序不變。
- Test mapping：`visit-line-inbound.test.ts`、`visit-line-webhook-application.test.ts`、五個 legacy LINE adapter tests、handler/timeout tests；最後以 full test/typecheck/lint/build、CodeGraph importer map 和跨批次 Chrome journey 驗收。
- Intentional changes：只有 internal owner/path consolidation；沒有產品行為變更。
- Open questions：U-01/U-02 與 provider sandbox 未關閉前，不把 fixture coverage 說成 real LINE/Supabase acceptance；canonical EventEnvelope/runtime/outbox 留在 WP-05/06。

- [x] 將 5 個 route-slice port modules 收斂為 `line-contracts.ts`。
- [x] 將 inbound normalize 與 failure-isolated dispatch 收斂為 `line-inbound.ts`。
- [x] 將 4 個 thin legacy LINE adapter 收斂為同一 compatibility boundary。
- [x] 完成 full automated verification 與 CodeGraph owner/importer evidence。
- [ ] 下一次跨批次集中跑 Chrome authenticated Visit／TV／Outputs journey；不觸發真實 LINE/provider side effect。

**Evidence（2026-07-31）：**

- production boundary 從 5 個 LINE port files、1 個 dispatch application、4 個 thin legacy adapter 收斂為 `line-contracts.ts`、`line-inbound.ts`、`legacy-line-adapters.ts` 三個具名 owner；總計淨刪 8 個 production files。image／text／offer／invite／postback／timeout 的 handler 保留，因為它們各自有可觀察的 side-effect ordering，不是假 forwarding layer。
- CodeGraph sync 後全 repo 為 448 files／3,666 nodes／7,704 edges；舊 port／application／adapter import 為零。`dispatchVisitLineWebhookEvents` 仍只有 `/api/line/webhook` 的 `POST` caller；`runVisitTimeoutApplication` 仍只有 `/api/cron/visit-timeout` 的 `GET` caller。
- `npm test` 106 files／521 tests、`npm run typecheck`、`npm run lint`、`npm run build`、`git diff --check` 全數通過。這證明 static/fixture contract 與 build continuity；真實 LINE、Supabase、provider 與 authenticated browser journey 仍受 U-01/U-02/U-04 限制，列為下一次集中驗收。

#### 進場清理 — Visit research capability

**Status（2026-07-31）：** structural cleanup complete（`Contract tested`）；這是既有 authenticated research API 的 internal owner consolidation，不是研究功能、資料模型或 provider 行為變更。Chrome cross-batch authenticated evidence 仍待集中驗收。

**Behavior contract (`behavior-contract/v1`, `visit.research.capability`)**

- Scope：`GET/POST /api/agents/visit/research`、`ContactResearchPanel`，以及 contact lookup、research provider、ten-profile projection 的既有 orchestration。
- Non-goals：不改 route URL/method/status/payload、request normalization、`contacts` query、research provider、profile list ordering/limit、activity/runtime、UI/UX 或 schema。
- Entrypoints／consumers：GET/POST 各是 parser/use-case 的唯一 production caller；browser consumer 維持呼叫同一 API；真正的 Supabase + research-provider translation 保留為 named source。
- Invariants：contactId 指定時 DB row 仍覆寫 typed name/company/title/email；空 name 仍 400；research null/failure 仍 502；success 仍回 `id` 加 ten-profile projection；GET 仍只回 `{ profiles }`。
- Acceptance examples：`{ contactId:"c1", name:"typed" }` 仍以 contact row 的 name 研究；缺 name 不呼叫 provider；provider failure 不回 partial success；任一 route payload/status 不變。
- Test mapping：research parser/use-case/source tests、route contract、full test/typecheck/lint/build；Chrome 留至跨批次 authenticated UI 驗收。
- Intentional changes：只把 singleton rules/port/application 收斂成 capability，adapter 改名為具體 legacy data source；沒有行為改動。
- Open questions：沒有 real Supabase/provider fixture 時，contract test 不等於 production-like provider acceptance。

- [x] 收斂 request parser、research use case 與 source contract 為 `research.ts`。
- [x] 將實際 Supabase + provider translation 改名為 `legacy-research-source.ts`，不保留假 forwarding adapter。
- [x] 完成 CodeGraph caller/import map 與 full automated verification。
- [ ] 下一次跨批次集中驗證 authenticated `ContactResearchPanel` loading/empty/success/failure UI；不送出實際 research provider side effect。

**Evidence（2026-07-31）：**

- `research-rules.ts`、`research-ports.ts`、`research-application.ts` 收斂為 `research.ts`；真正的 Supabase contact lookup + `contact-research` provider translation 保留為 one named source。production files 淨少 2 個，沒有把 query 或 provider call 塞回 route。
- CodeGraph sync 後全 repo 為 446 files／3,660 nodes／7,698 edges；舊 research rules/port/application/adapter import 為零。GET/POST 維持唯一 callers：POST 呼叫 `runVisitResearch`，GET 呼叫 `runVisitResearchRead`，兩者皆仍使用同一 legacy research source。
- `npm test` 106 files／521 tests、`npm run typecheck`、`npm run lint`、`npm run build`、`git diff --check` 全數通過。此為 fixture/static contract evidence；真實 Supabase/OpenAI-like provider 與 authenticated UI interaction 仍延至 cross-batch acceptance。

#### 進場清理 — Visit AI capability

**Status（2026-07-31）：** structural cleanup complete（`Contract tested`）；這是 draft email／business-card parsing 的 internal owner consolidation，不改任一 route payload、provider request、activity row 或畫面。Chrome/UI 與真實 provider journey 仍留待跨批次集中驗收。

**Behavior contract (`behavior-contract/v1`, `visit.ai.capability`)**

- Scope：`POST /api/agents/visit/draft-email`、`POST /api/agents/visit/parse-card` 的 request parsing、provider invocation、activity success/failure record 與 response mapping。
- Non-goals：不改 OpenAI-like provider、`line_agent_activity` schema/row、route URL/method/status/payload、名片/邀約信文案、UI/UX、runtime/migration 或任何 real provider side effect。
- CodeGraph evidence：`runDraftInviteEmail`、`runParseBusinessCard` 各只有自己的 route caller；原 factory 只由這兩條 route 共用；原 port type 只連到 capability、自身 adapter 與 tests。
- Invariants：draft request 的 defaults/validation、card 的 data-url validation、成功與失敗 activity wording/status、provider failure 的 `502`、成功 `{ draft }`／`{ contact }` payload 全部維持。
- Design：`ai.ts` 是 parser/result/use-case/dependency contract 的單一 owner；legacy dependencies 保留 provider delegate + activity persistence translation，不把 provider 或 DB query 塞進 route。
- Acceptance：完整 automated verification、CodeGraph caller/import map；Chrome/UI 與 real provider journey 仍留待跨批次驗收。

**Evidence（2026-07-31）：**

- `ai-application.ts`、`ai-rules.ts`、`ai-ports.ts` 收斂為 `ai.ts`；provider delegate 與 `line_agent_activity` insert 改名為 `legacy-ai-dependencies.ts`，仍是唯一的 provider/persistence translation。
- CodeGraph sync 後 `runDraftInviteEmail` 與 `runParseBusinessCard` 分別只有各自 route caller；`createLegacyVisitAiDependencies` 只被兩條 API route 共用；舊 import/type/factory 搜尋為零。全 repo 為 406 files／3,410 nodes／7,058 edges。
- 三個既有 focused test files 全部保留（其中 adapter test 改名為 dependencies test）；`npm test` 94 files／465 tests、`npm run typecheck`、`npm run lint`、`npm run build`、`git diff --check` 全數通過。
- [x] 保留 input validation、activity success/failure order 與 provider/database translation。
- [ ] 在後續跨批次驗收中，以 provider-safe fixture/Chrome 檢查 Visit UI loading/error/success；不從本批宣稱真實 provider side effect 已驗。

#### 進場清理 — Inactive Visit runtime scaffold

**Status（2026-07-31）：** structural cleanup complete（`Contract tested`）；CodeGraph preflight 已確認這組 prospective runtime modules 沒有任何 production caller，僅在彼此與專屬 fixture/unit tests 間循環。它不應與已運作的 LINE workflow 並列為第二條 truth。Chrome cross-batch evidence 仍待集中驗收。

**Behavior contract (`behavior-contract/v1`, `visit.inactive-runtime-scaffold.cleanup`)**

- Scope：刪除無 production consumer 的 Visit state-machine／intent executor／replay／projection／mode／workflow draft，以及只服務該 draft 的 fixture/tests。
- Non-goals：不改 LINE webhook、timeout、research、public invite response、legacy schema write mapper、`agent_runs`／`agent_run_steps`／`agent_artifacts`、UI/UX 或 WP-05/06 runtime roadmap。
- Entrypoints／consumers：CodeGraph 對 `evaluateVisitEvent`、`replayVisit`、`planVisitFlow`、`VISIT_WORKFLOW` 均無 production caller；唯一 live schema import 是未使用 snapshot rehydration type/mappers，會一併移除但保留寫入 mapper。
- Inputs／outputs／side effects：沒有任何 route、DB、provider、event、timer 或 UI side effect；刪除後仍保留現行 legacy contact/offer/invite rows 的 insert/update patch payload。
- UI states：無 browser-visible owner；受影響 UI 只在後續跨批次 Visit/TV/Outputs smoke 中確認未回歸。
- Invariants：不以 test-only state machine 假裝 canonical runtime；未來 runtime 只能在 U-02 關閉且有真實 production consumer 後，依 WP-04/05 的 event/idempotency/outbox contract 建立。
- Acceptance examples：production import map 對 targets 為零；legacy LINE card insert 和 invite/offer patch contract 持續通過；build 不再將任何 route 解析到 draft module。
- Test mapping：保留 legacy schema/LINE handler/timeout tests；移除只測未接線 draft 的 tests；以 CodeGraph, full test/typecheck/lint/build 及下一次 Chrome cross-batch evidence 驗收。
- Intentional changes：刪除 inactive implementation 與其專屬 tests，這是刻意減少虛假 coverage，不是功能刪除。
- Open questions：真實 runtime persistence 仍受 U-01/U-02/U-04 阻擋，不能由刪除草稿推論已完成。

- [x] 刪除沒有 production caller 的 Visit runtime draft、parity fixture 與專屬 tests。
- [x] 將 legacy schema 改為只保留 production row write mapper，不再依賴 draft state-machine type。
- [x] 完成 CodeGraph/import audit 與 full automated verification。
- [ ] 下一次跨批次集中驗證 authenticated Visit／TV／Outputs UI，並保留 U-01/U-02/U-04 的 real-data/provider gates。

**Evidence（2026-07-31）：**

- 移除 7 個未接線 production modules（state machine、intent executor、projection、replay、mode、workflow）、1 個專屬 parity fixture、5 個專屬 unit tests；`legacy-schema.ts` 保留真正在 LINE contact/offer/invite adapter 使用的 insert/update payload mapper，並以 `LegacyContactInput` 取代錯誤的 draft-state dependency。
- CodeGraph sync 後全 repo 為 433 files／3,565 nodes／7,451 edges；對已刪 symbol 與 `modules/visit/{domain,application,intent-executor,projection,replay,mode,workflow}` 的 source/test import 搜尋皆為零。沒有 route、DB/provider、timer 或 UI consumer 曾指向它們。
- `npm test` 101 files／484 tests、`npm run typecheck`、`npm run lint`、`npm run build`、`git diff --check` 全數通過。減少的 5 test files／37 tests 只驗證 inactive draft；保留的 `visit-legacy-schema.test.ts` 直接覆蓋 live LINE row mappers。這仍不替代 real LINE/Supabase/authenticated browser acceptance。

#### 進場清理 — Visit public invite response sources

**Status（2026-07-31）：** structural cleanup complete（`Contract tested`）；這是同一條 public invite-response workflow 的 contract/source consolidation，不移動 route 的 HTML/transport behavior 或任何 calendar/email/LINE side-effect ordering。Chrome/provider-safe cross-batch evidence 仍待集中驗收。

**Behavior contract (`behavior-contract/v1`, `visit.public-response.sources`)**

- Scope：`GET/POST /api/agents/visit/respond` 所使用的 read/fulfilment contracts 與 legacy source translations。
- Non-goals：不改 route URL/method/query/form/status/HTML、optimistic confirmation query、invite row schema、calendar/event/email/LINE/research provider、activity row、`after()` background research、UI/UX。
- Entrypoints／consumers：read source 只由同一 route 的 GET/POST 使用；fulfilment source 只由同 route POST 使用；兩者同屬 public invite-response bounded workflow。
- Invariants：pending invite 的 select/update/refetch query、confirmed/calendar_event branch、settings/calendar/email/push/activity/failure/research method signatures與順序不變；route 仍保有 HTTP/HTML response mapping。
- Acceptance examples：pending choice 仍只更新 `status=pending` row；already confirmed row 仍 refetch；calendar failure 仍 mark failed + activity + best-effort LINE push；GET/POST payload and page result 不變。
- Test mapping：read/fulfilment source tests、route contract/full test/typecheck/lint/build；Chrome public invite response flow 留至 provider-safe cross-batch acceptance。
- Intentional changes：兩份 port 改為同一 workflow contracts、兩份 adapter 改為同一 named legacy sources file；沒有產品行為變更。
- Open questions：真實 calendar/email/LINE delivery 不能由 mock proof 取代，仍待 U-04 provider-safe verification。

- [x] 收斂 read/fulfilment contracts 為 `respond-contracts.ts`。
- [x] 收斂 legacy read/fulfilment translations 為 `legacy-respond-sources.ts`，保留兩個具名 source factory。
- [x] 完成 CodeGraph caller/import map 與 full automated verification。
- [ ] 下一次 provider-safe cross-batch 驗證 public invite response 與 authenticated Visit/TV/Outputs UI。

**Evidence（2026-07-31）：**

- `respond-ports.ts` 與 `respond-fulfilment-ports.ts` 收斂為一份 workflow contract；`legacy-respond-read-adapter.ts` 與 `legacy-respond-fulfilment-adapter.ts` 收斂為一份 legacy sources file。read/fulfilment 的 method surface、Supabase query、provider binding 與 route HTML 都未改，production files 淨少 2 個。
- CodeGraph sync 後全 repo 為 431 files／3,558 nodes／7,466 edges；舊 contract/adapter import 為零。`createLegacyVisitRespondReadSource` 仍只有同 route GET/POST 兩個 caller，`createLegacyVisitRespondFulfilmentSource` 仍只有同 route POST caller。
- `npm test` 101 files／484 tests、`npm run typecheck`、`npm run lint`、`npm run build`、`git diff --check` 全數通過。這固定 mock/static contract，不把它說成真實 Calendar/Email/LINE delivery 或 browser journey acceptance。

### WP-05 — Visit LINE text vertical slice

**Goals:** G-02、G-03、G-05、G-06

**Anchors:** LINE webhook、text application、workflow、Visit persistence/delivery/runtime adapters。

- [ ] LINE event normalize 成 canonical EventEnvelope。
- [ ] text journey 使用 canonical runtime repository/kernel。
- [ ] 保存既有 reply、tag、activity、live-task與run/artifact behavior。
- [ ] delivery 走 idempotent outbox/receipt；provider failure可 retry/reconcile。
- [ ] legacy/new 支援 shadow compare 或可回退 routing。
- [ ] 只抽出 text slice 真正需要的 runtime capability。

**Verification:** duplicate event、normal reply、waiting input、provider failure/retry、process restart/resume、LINE fixture/sandbox；Visit/TV/Outputs UI parity。

**Rollback:** flag/routing 回 legacy text handler；new writes需可reconcile，不造成雙重delivery。

**Done when:** 一條真實 production-like text flow 由canonical runtime擁有且可回退。

### WP-06 — Visit remaining flow cutover

**Goals:** G-04～G-07

- [ ] 依序移轉 image/card → offer → approval/invite → postback → timeout。
- [ ] webhook 與 timeout 共用同一 run/workflow state。
- [ ] 每 slice 重用 WP-05 能力；若需新增 abstraction，必須出現第二 consumer或實質新邊界。
- [ ] parity/reconciliation 達標後切流。
- [ ] 刪除 Visit legacy runtime/workflow alias adapters與直接 owner。

**Verification:** 每 slice happy/failure/duplicate/retry；完整 card-to-invite journey；timeout/recovery；authenticated UI/TV evidence。

**Done when:** LINE/timeout 核心 journey 全由新 owner執行，legacy caller歸零。

### WP-07 — Meeting consolidation

**Goals:** G-02～G-04

**Status（2026-07-31）：** structural consolidation complete（`Contract tested` + `Render smoke passed`）。此包只做 domain-level ownership consolidation；不改 meetings／meeting_turns／Storage schema、不觸發真實會議或 provider side effect。session lifecycle（start／finish／turn log／recording）、audio（TTS／transcribe）、conversation command、realtime session／usage 已收斂；有憑證的完整功能旅程與 production-like acceptance 留在 WP-11。

**Behavior contract (`behavior-contract/v1`, `meeting.capabilities`)**

- Scope：`/meeting` 與 `/api/meeting/{start,command,realtime-session,log-turn,recording,speak,transcribe,finish,log-usage}`；`meetings`、`meeting_turns`、private `meeting-recordings` bucket；OpenAI command/realtime/TTS/transcription；AI usage log。
- Non-goals：不改 UI/UX、route URL/method/status/payload、資料表／bucket、Agent roster、voice/提示詞、錄音格式或 provider 選型。
- Entrypoints／consumers：Meeting page 會 create session、mint realtime token、逐句 log、TTS/STT、finish/upload；九個 route 都是 public compatibility façades。CodeGraph 已證明 start/finish/log/recording/audio/realtime applications 幾乎都是單 route consumer；command 是唯一多 side-effect orchestration。
- Invariants：start 失敗仍回 500；finish 缺 id/錯 form 仍 400，錄音 upload 失敗仍 finish 並回 `recordingSaved:false`；turn log 寫入失敗不能中斷會議；recording 缺 id/無檔仍為 400/404；TTS/STT/provider failure 為 502；realtime context/history failure 保留 empty fallback；usage recorder 失敗維持既有 route throw boundary。
- UI states：登入後 `/meeting` 的 first paint、開會按鈕、Agent roster、loading/error/permission state 與 desktop/mobile layout 不變。因無 Supabase/OpenAI credentials，本批只驗 render 與無副作用互動，不能宣稱已完成 real voice journey。
- Acceptance：相同 request 仍得到相同 JSON/audio response；單一 turn 維持 single-row append shape，command round 維持 boss→agent(s)→teamlead append ordering；錄音 URL 繼續是 signed URL；任何被保留的 adapter 需是 Supabase Storage/repository 或 OpenAI provider translation，而非 route action alias。
- Intentional changes：只有 module/test/adaptor owner 收斂；observable behavior 無變更。

- [x] 收斂 session lifecycle：start／finish／turn log／recording 共用 `session.ts` 與一個 Supabase/Storage repository；四條 route 維持 façade。
- [x] 收斂 audio：TTS／transcribe 共用 `audio.ts`、保留原始 defaults/error semantics，並以一個 OpenAI provider service 供兩條 route 重用。
- [x] 收斂 conversation command：roster、fallback、round/one-to-one 編排進 `conversation.ts`；history/turn persistence 重用 session repository，OpenAI conversation 為獨立 provider。
- [x] 收斂 realtime session／usage：`realtime.ts` 擁有 request、roster、mint orchestration 與 usage log；session history 重用既有 repository。
- [x] 依真實替換邊界整理 adapters：Supabase/Storage session repository、meeting context provider、OpenAI audio/conversation/realtime provider、AI usage repository；無 route action alias。
- [x] 統一 meeting／turn lifecycle與既有 failure semantics，並刪除所有 Meeting route-specific四件組。
- [x] 保持 Meeting page request／response contract與 first-paint UI state。

**Evidence（2026-07-31）**

- Owner delta：Realtime／usage 的 8 個 production files、206 LOC 收為 1 個 capability module + 3 個真實外部邊界 adapter、194 LOC；6 份薄測試（354 LOC）收為 1 份 Realtime suite（311 LOC），turn parsing 併回 session suite。不是增加 framework。
- CodeGraph sync 後，`runRealtimeSession`／`runMeetingRealtimeUsageLog` 各只由相應 API façade 呼叫；`mintRealtimeSession`、`logRealtimeUsage`、demo/live context 各只經其命名 adapter；舊 route-slice import 為零。`rg` 另確認 session repository 持續為 start／finish／log-turn／recording／command／realtime 的唯一 meeting-store owner。
- 5 份 Meeting focused test files、39 assertions，包含 Realtime 404／502／400 route contract、provider/context/usage forwarding、既有 fallback 與 uncaught usage failure；`npm run typecheck`、`npm run lint` 通過。
- 已登入 Chrome 的 `/meeting` 改前後 DOM snapshot 完全一致（804 chars）、console 無 error/warn。未點「開會」或送 command，避免建立真實 session／取得麥克風／呼叫 provider。
- 證據等級止於 contract + render smoke：沒有 Supabase/OpenAI credentials，shell API 會被 middleware 回 `401`，Chrome 直接開 API URL 又受 client blocker 影響；因此不把 route tests 或 first paint 描述成真實語音、持久化或完整互動旅程。

**Functional verification gate:** 有憑證 staging 需執行 start→command/voice→turn→finish、recording upload/read、provider timeout/error、authenticated visual/interaction；列為 WP-11 acceptance，不阻塞本次結構收斂。

**Rollback:** 此 commit 可整體 revert；API façade、payload、schema 與外部 provider 呼叫 shape 均未改，無 dual-write 或資料 migration。

**Done when:** Meeting 的 domain-level owner consolidation 已完成；完成整體重構前仍須通過 WP-11 的有憑證 functional／production-like acceptance。

### WP-08 — Orders and Reporting production slices

**Goals:** G-03～G-06

**Status（2026-07-31）：** in progress。Orders 與兩條 daily-report 的 pre-runtime domain owner consolidation 已完成（`Contract tested` + `Render smoke passed`）；它只收斂既有 Webhook／測試通知／晨報行為，不把既有 `order_id` upsert 說成 delivery dedupe，也沒有實作 transaction、outbox、artifact receipt 或 runtime cutover。

**Orders behavior contract (`behavior-contract/v1`, `orders.notifications`)**

- Scope：`GET/POST /api/webhooks/teachify-order`、`POST /api/agents/orders/test-notify`、`/agents/orders`；既有 `teachify_orders`、`line_agents`、`line_agent_activity`、LINE push message renderer。
- Invariants：Teachify verifier、invalid signature 的 `401` activity、invalid JSON 的 `400`、先 upsert 再讀 Agent config、disabled／missing recipient／delivery failure 的 response 與 activity 文案、測試通知的 recipient validation 與 LINE 內容均不變。
- Intentional limit：沒有改 payload/schema、驗簽策略、`onConflict: "order_id"`、寫入／推播順序或前端操作；upsert 不能保證 external delivery exactly-once，這必須等 WP-04/05 的 transaction + outbox 才能處理。

- [x] 收斂 Orders webhook 與測試通知：單一 `orders.ts` 擁有 normalize、notification planning、兩條 orchestration；兩個 API façade 共用 Supabase repository 與 LINE delivery adapter。
- [ ] Teachify event normalize、signature/payload contract、duplicate suppression。
- [ ] order persistence與notification用 transaction/outbox semantics。
- [x] 收斂 Team Lead／Support daily report：各自維持 domain workflow，cron 與 manual route 共用各自 composition root；只共用已具兩 consumer 的 OpenAI summary provider 與 LINE delivery，不建立假泛型 runner。
- [ ] report artifact與delivery receipt可追溯到run。
- [ ] 第二種 execution profile 重用 WP-04/05 runtime，驗證抽象不是 Visit 特例。

**Orders evidence（2026-07-31）**

- Owner delta：11 個 production files、371 LOC 收為 1 個 Orders capability module + 2 個真正的 Supabase／LINE adapters、313 LOC；7 份薄測試收為 3 份（433→447 LOC，新增的是 route contract，非重複 wrapper）。
- CodeGraph sync：`processOrderPayload` 與 `runOrderTestNotification` 各只由其 API façade 呼叫；兩條 route 都共用同一 Supabase repository 與 LINE delivery；舊 Orders route-slice import 為零。
- 3 份 Orders focused test files、23 assertions 通過，涵蓋 parsing、寫入／delivery ordering、fallback、兩個 adapter mapping、401／400／test-notify route contract；`npm run typecheck`、`npm run lint` 通過。
- 已登入 Chrome 的 `/agents/orders` 改前後 DOM snapshot 完全一致（6,373 chars）、console 無 error/warn。未點「傳送測試訂單通知」，避免真正 LINE side effect；因此不宣稱 real delivery journey 已驗。

**Daily report behavior contract (`behavior-contract/v1`, `reports.daily`)**

- Scope：Team Lead／Support 的 cron 與 manual report-now route、`line_agents`、`line_agent_activity`、`line_support_conversations`、`line_subscribers`、OpenAI summary、LINE push。
- Invariants：disabled／missing recipient 仍在讀取資料前退出；兩種 24-hour query、customer/Agent grouping、fallback、AI unavailable fallback、delivery failure activity 與所有既有文案不變；prompt、usage operation／agent slug 與 renderer payload 保留原值。
- Design：Team Lead 的團隊活動與 Support 的客戶對話各自擁有 prepare／run workflow；只有同一 OpenAI protocol + AI usage logging、同一 LINE renderer 是已驗證的兩 consumer provider 邊界。沒有建立跨 domain report framework。

**Daily report evidence（2026-07-31）**

- Owner delta：8 個 production files、600 LOC 收為 2 個 domain modules + 2 個 Supabase repository + 2 個雙 consumer provider、518 LOC；6 份測試收為 5 份（592→686 LOC，增加的是兩個 repository mapping 與 shared provider protocol assertion）。
- CodeGraph sync：兩個 domain runner 各只由自己的 composition root 呼叫；OpenAI summary provider 和 LINE delivery 各由 Team Lead／Support 兩條 flow 共用；舊 report route-slice import 為零。
- 5 份 focused test files、31 assertions，涵蓋兩個 domain 的 rules／ordering／fallback、Supabase table mapping、OpenAI request + usage identity、LINE renderer；`npm run typecheck`、`npm run lint` 通過。
- 已登入 Chrome：`/agents/support` DOM 完全一致（6,111 chars）；`/agents/teamlead` 的產品 DOM 一致（6,253 chars），唯一原始 snapshot 差異是 Next dev 工具注入的 `Open Next.js Dev Tools` 按鈕出現／消失；兩頁 console 無 error/warn。未按兩個「立即產生並送出」按鈕，避免真實 OpenAI／LINE side effect。

**Verification:** duplicate/invalid webhook、partial provider failure、same-period cron dedupe、artifact parity、replay；Orders/Support dashboard actions。

**Done when:** 至少 short-event + scheduled-batch 共用canonical runtime；legacy Orders/Reporting owner可刪。

### WP-09 — Canonical Agent model

**Goals:** G-01、G-04、G-05

#### Canonical identity compatibility batch

**Status（2026-07-31）：** compatibility foundation complete（`Contract tested` + `Render smoke passed`）。此批建立可驗證的 canonical identity 與 legacy mapping；既有 static roster、`line_agents` 與 public catalog 尚未被取代，逐 consumer cutover 留在後續工作包。沒有 consumer 的 ProductOffering mapper 不保留為 production code。

**Behavior contract (`behavior-contract/v1`, `agents.canonical-identity`)**

- Scope：`RoleTemplate`、`AgentInstance`、`ExecutionProfile`、`AgentPresentation` 的純 model；`AGENTS`、`line_agents` 與 workflow contract 的 compatibility mapping；`AGENT_CATALOG` 保持既有 public catalog input；`GET /api/agents` 與 client status fallback。
- Non-goals：不改 UI/UX、route URL/method/status/payload、`AgentSlug`、`line_agents` schema／write 行為、workflow trigger semantics、prompt／provider／delivery；不把 public catalog 或 Super Agent Team 誤當 deployed runtime instance。
- Invariants：static `AGENTS` 在 WP-10 前仍是既有 UI presentation baseline；`line_agents.enabled` 仍優先於 static fallback；legacy slug 永不改名；workflow binding 保留原 type/import contract；presentation 不能成為 runtime truth。
- Acceptance：每一個既有 `AGENTS` entry 對應一個唯一 canonical instance 與 role template；同一個 `line_agents` override 只能改自己的 enabled/settings projection，不能改任何 presentation；public catalog 保持獨立於 deployed Agent，直到有真實 projection consumer 才建立對應 mapper。
- Evidence：本輪完成 mapper／route compatibility tests 與 static checks；full test、build 集中在 source cutover 後一次執行。依最新工作方式，完整 Chrome authenticated parity 留到後續程式碼批次全部完成後再統一執行。

**Evidence（2026-07-31）：**

- `identity.ts` 擁有 `RoleTemplate`、`AgentInstance`、`ExecutionProfile`、`AgentPresentation` 與 duplicate-identity validation；不從名稱／展示文案猜 capability 或 workflow binding。
- `LEGACY_AGENT_DATA` 是 static compatibility input；`CANONICAL_AGENT_REGISTRY` 產生 frozen `AGENTS` projection，因此原本 39 個 `AGENTS` caller 不需逐頁改 import，仍取得精確相同的 `AgentMeta` shape。`AGENT_CATALOG` 保持 public catalog 的既有獨立資料來源，沒有混成 deployed instance。
- `line_agents` override 只覆寫同 slug 的 enabled/settings deployment state；`GET /api/agents` 與 `agent-status` fallback 已先改由 canonical status catalog 供應，API payload 與 UI shape 不變。workflow contract 保持原 import path，改為 re-export canonical types。
- 新增 4 個 mapper contract tests；source cutover 後整批 `npm test` 為 106 files／521 tests、typecheck、lint、production build、`git diff --check` 通過。CodeGraph sync 後索引 456 files／3,700 nodes／7,736 edges，確認 `LEGACY_AGENT_DATA → CANONICAL_AGENT_REGISTRY → AGENTS` 的單向鏈結。
- 本批前半已在登入 Chrome 實看 `/dashboard`、`/tv`、`/agents/support`：status projection、10/12 TV 值勤顯示與客服控制台畫面正常，console 無 error/warn；最終 `AGENTS` source projection 則由 exact-equality contract test 保護。依 batching 規則，完整 post-cutover Chrome 回歸不在本 micro-cut，而留在下一個跨批次驗收。Chrome 對直接 `/api/agents` 導航仍受 client blocker 擋住，故 API 實體契約證據來自 route test，未假稱 browser API acceptance。

#### 進場清理 — Inactive public catalog mapper

**Status（2026-07-31）：** structural cleanup complete（`Contract tested`）；這是刪除沒有 production consumer 的 ProductOffering draft，不改 public catalog 或 canonical deployed Agent identity。

**Behavior contract (`behavior-contract/v1`, `agents.inactive-public-catalog-mapper`)**

- Scope：移除 `ProductOffering`／legacy catalog input mapper 與只服務於該 mapper 的 adapter；保留 `AGENT_CATALOG` 和 deployed Agent identity model。
- Non-goals：不改 public catalog UI、`AGENTS`、`line_agents`、route payload、AgentSlug、workflow binding、prompt/provider/delivery 或 UI/UX。
- CodeGraph evidence：`mapLegacyProductOffering`、其 input/type 與 `LEGACY_PRODUCT_OFFERINGS` 沒有 production caller；source search 唯一 consumer 是 identity unit test。
- Invariants：公開 catalog 仍不可被誤當 deployed instance；canonical identity 仍只由 legacy dashboard Agent → registry → `AGENTS` projection 建立。
- Acceptance：舊 mapper/adapter/import 歸零，identity status/duplicate tests 仍通過；未來 public catalog 切換到 canonical projection 前，必須先有 real UI/API consumer 和新的 behavior contract。

**Evidence（2026-07-31）：**

- CodeGraph sync 後為 405 files／3,401 nodes／7,026 edges；`mapLegacyProductOffering`、`ProductOffering`、`LEGACY_PRODUCT_OFFERINGS` 都已不存在，刪除前沒有 production caller。
- source 與 test import search 已歸零；唯一的舊 consumer 是為該 test-only mapper 寫的 identity unit assertion。
- 完整驗證通過：94 test files／465 tests、`npm run typecheck`、`npm run lint`、`npm run build`、`git diff --check`。
- identity test 保留 static status fallback、canonical identity 與 duplicate coverage；只移除 test-only ProductOffering mapper 的三個 assertion。這沒有 UI source change；完整 Chrome catalog／Agent pages 仍併入後續跨批次驗收。

#### 進場清理 — Agent admin compatibility boundary

**狀態（2026-07-31）：** structural cleanup complete（`Contract tested` + `Render smoke passed`）；這只處理既有 route-slice 過細與假 adapter，不代表 WP-09 的 canonical Agent model 已開始或已完成。

**Behavior contract (`behavior-contract/v1`, `agent.admin.compatibility`)**

- Scope：`GET /api/agents`、`GET/PATCH /api/agents/[slug]`、`POST /api/agents/[slug]/test-push`，以及 schedule／GA4／GSC／pipeline 的四個 overview read route；`line_agents`、`line_agent_activity`、既有 LINE message renderer 與既有 Google／GA4／GSC／Teachify provider helper。
- Non-goals：不改 `AGENTS`、`AGENT_CATALOG`、`line_agents` schema／資料格式、workflow contract、route URL/method/status/payload、UI/UX、LINE channel 選擇或外部 provider 選型；不把 presentation slug 當 canonical identity。
- Ownership：`line_agents` 的 read/update/status fallback 與 activity 寫入收斂為一個 agent-admin repository；test push 保持獨立的 delivery capability；四個 overview route 直接使用其各自真正 provider helper，不保留只有一個 caller 的 generic port／adapter forwarding layer。
- Invariants：unknown instance 仍 `404`；PATCH 仍只接受 boolean `enabled` 與 object `settings`、空/錯 JSON 仍做 timestamp-only update、activity 順序與文案不變；database enabled 仍覆寫 static default、provider 失敗仍 fallback；test push 的 input validation/style default/support channel/LINE renderer/activity/error `502` 不變；overview 的 `days` default、`{ ok, data }`／`{ ok:false, error }`、`502` 不變。
- Verification：CodeGraph caller/impact map、focused contract/route tests、typecheck/lint，並以 Chrome 對 `/goals`、`/agents/support`、`/agents/operations`、`/agents/schedule` 做 before/after DOM + console comparison；不點擊會造成真實 LINE 或 provider side effect 的按鈕。

- [x] 將 agent instance read/update/status 收斂成一個真實 `line_agents` admin boundary。
- [x] 將 test push 收斂成一個 delivery capability，保留 LINE 與 activity 的明確 adapter。
- [x] 移除四個 single-caller overview forwarding adapters 與通用 port，改由 route 直接呼叫既有 provider helper。
- [x] 以 route contract 與 Chrome parity 證明 compatibility；CodeGraph 舊 caller 歸零。

**Evidence（2026-07-31）：**

- 14 個 module／8 個 adapter 的 route-slice 檔案收斂為 2 個有明確責任的 Agent module、2 個真實 adapter、1 個由四個同契約 route 共用的 response helper；7 條既有 API façade 的 URL、method、status/payload 不變。沒有把四種外部 overview provider 偽裝成同一個 Agent repository。
- 14 個切碎的 unit test files 改為 6 個 capability/adapter/route contract files、14 個 focused tests；覆蓋 `line_agents` select/update/status、activity、PATCH parser、test-push LINE failure、四個 overview success/default/error，以及 route 的 `404`/`400`/`502` mapping。
- CodeGraph sync 證實 `readAgentInstance`、`updateAgentInstance`、`readAgentStatuses`、`runAgentTestPush` 各只由原本 API façade 呼叫，`readOverview` 則由四個 overview route 共用；舊 application/port/legacy-adapter import 為零。
- focused `npx vitest run`（6 files／14 tests）、full `npm test`（116 files／505 tests）、`npm run typecheck`、`npm run lint`、`npm run build`、`git diff --check` 通過。Chrome before/after：`/agents/support` 6,078、`/agents/operations` 6,656、`/agents/schedule` 6,224 chars 完全一致；`/goals` 11,042 chars 的產品 DOM 一致，唯一原始差異為 Next dev 的 `Open Next.js Dev Tools` 按鈕。四頁 console 無 error/warn；未點擊任何會發 LINE 或第三方 provider side effect 的控制項。

#### 進場清理 — Agent chat capability

**狀態（2026-07-31）：** structural cleanup complete（`Contract tested` + `Render smoke passed`）；它仍是目前 static roster 的相容 consumer，並不是 canonical Agent model mapper，也沒有改動 roster、prompt 或 UI 行為。

**Behavior contract (`behavior-contract/v1`, `agent-chat.capability`)**

- Scope：`POST /api/agent-chat`、dashboard `AgentChatWidget`、TV `CommandConsole`；static `AGENTS` roster projection、live context、OpenAI chat reply、canvas enrichment。
- Non-goals：不改 UI/UX、route URL/method/status/payload、Agent roster/name/role/teamlead 判斷、prompt、history 格式、OpenAI/canvas provider、資料表或 canonical Agent identity。
- Invariants：payload 仍只接受 string `agentSlug`/`message`/`history`；message trim 但 slug 不 trim；missing input `400`、unknown Agent `404`、reply failure `502`；context/canvas failure 均 best-effort、不可中斷 reply；empty reply 仍回既有 fallback；reply/canvas 的 provider payload 和 roster projection 不變。
- Design：把 rules、ports、application 收斂為一個 cohesive chat capability；保留一個真正負責 static roster／context／OpenAI／canvas translation 的 composition adapter，移除 `legacy` 命名與每個 single-route layer。
- Verification：CodeGraph caller map、capability/adapter/route contract tests、typecheck/lint/build，並以 Chrome 對 `/goals` 與 `/tv/console` 做 before/after DOM + console comparison；不送出任何真實 chat message。

- [x] 收斂 Agent chat capability 與 composition adapter，維持 API façade。
- [x] 以 route contract 補齊 `400`/`404`/`502`/success response。
- [x] CodeGraph 舊 caller/import 歸零與 Chrome parity 通過。

**Evidence（2026-07-31）：**

- 原本 3 個 route-slice module + 1 個 `legacy` adapter 收斂為單一 `chat.ts` capability 與一個具實際 static roster／context／OpenAI／canvas translation 的 composition adapter；`/api/agent-chat` façade 與兩個前端 consumer 未改。
- 3 個 focused test files 維持 22 個 cases，並補上原本沒有的 route `400`／malformed JSON／`404`／`502`／success contract；parser 的所有 invalid shape、slug/message/history semantics、context/canvas best-effort、fallback、provider payload、static roster projection 全數保留。
- CodeGraph sync 證實 `runAgentChat` 與 `createAgentChatComposition` 各只有同一個 API façade caller；舊 application/ports/rules/legacy-adapter import 為零。
- focused `npx vitest run`（3 files／22 tests）、full `npm test`（116 files／505 tests）、`npm run typecheck`、`npm run lint`、`npm run build`、`git diff --check` 通過。Chrome before/after：`/goals` 11,077 chars 完全一致；`/tv/console` 產品 DOM 593 chars 完全一致，唯一原始差異為 baseline 的 Next dev `Open Next.js Dev Tools` + alert 注入。兩頁 console 無 error/warn；未送出任何真實 chat message。

#### 進場清理 — Live task state and Visit history projections

**狀態（2026-07-31）：** structural cleanup complete（`Contract tested` + `Render smoke passed`）；這是既有 TV read model 的 consolidation，不是 RuntimeKernel/Outbox migration，也沒有改寫 Visit workflow。

**Behavior contract (`behavior-contract/v1`, `live-task.projections`)**

- Scope：`GET/POST /api/live-task`、`GET /api/live-task/{history,image}`、`/tv` 的 polling/read image，以及 `GET /api/cron/visit-timeout` 對 live state 的更新；`agent_live_task`、`agent_runs` current step、Visit contacts/offers/invites。
- Non-goals：不改 UI/UX、route URL/method/status/payload、TTL、`agent_live_task`/Visit schema、current-step lookup、cron auth/timeout behavior、RuntimeKernel/Outbox 或任何資料 migration。
- Ownership：state／current-step／image 是同一個 live-state repository，已由 API POST 與 Visit timeout 兩條 production flow 共用；Visit-only history projection 因讀取 contacts/offers/invites 保持獨立 repository。不可把 Visit history 偽裝成通用 Agent history。
- Invariants：read 同時無 live-state/current step 仍回 `{ active:false }`；step 對 status/caption/run/node 的 precedence、task image/TTL metadata、date fallback 不變；POST 的 patch coercion、missing agent `400`、store failure best-effort 不變；history 非 Visit/provider failure 均 `{items:[]}`、limit=8/outcome precedence 不變；缺 image 仍是 body-less `404`，success content type/cache header 不變；cron 仍只經由同一 state writer 更新 Visit UI。
- Verification：CodeGraph consumer map、state/history/image/route contract tests、typecheck/lint/build，並以 Chrome 對 `/tv` 做 before/after DOM + console comparison；不觸發 webhook、cron 或任何寫入操作。

- [x] 將 live state／step／image 收斂為一個兩-consumer state boundary，保留 Visit timeout compatibility。
- [x] 將 Visit history 留為獨立 projection repository，移除四組 single-route forwarding layer。
- [x] 補 route contract 並以 CodeGraph/Chrome parity 證明 compatibility。

**Evidence（2026-07-31）：**

- 12 個 live-task route-slice module 與 4 個 legacy adapter 收斂為 `state.ts` + `visit-history.ts`、live-state repository + Supabase Visit-history repository。state repository 是 `/api/live-task` GET/POST、image route、Visit timeout cron 共四個 production caller 的真實共享邊界；history 仍明確只有 Visit projection。
- 12 個切碎 test files／22 cases 收斂為 5 個 capability/adapter/route contract files／26 cases；保留 state/current-step precedence、TTL/image metadata、patch coercion、Visit outcome precedence、error fallback 與 image body/header，並新增 GET/POST/history/image response contract。
- CodeGraph sync 證實四個 API orchestration function 各只有原 API façade caller，state repository 四個 caller 與 Visit-history repository 一個 caller 都符合設計；舊 live-task application/port/rules/legacy-adapter import 為零。
- focused `npx vitest run`（5 files／26 tests）、full `npm test`（109 files／509 tests）、`npm run typecheck`、`npm run lint`、`npm run build`、`git diff --check` 通過。Chrome `/tv` before/after DOM 1,476 chars 完全一致，console 無 error/warn；未觸發 webhook、cron 或任何寫入控制項。

#### 進場清理 — AI usage reporting boundary

**狀態（2026-07-31）：** structural cleanup complete（`Contract tested` + `Render smoke passed`）；這是單一 dashboard read capability 的結構收斂，不是 AI budget policy、使用量資料模型或 Agent canonicalization 的改寫。

**Behavior contract (`behavior-contract/v1`, `ai-usage.reporting`)**

- Scope：`GET /api/ai-usage`、dashboard `/ai-usage`、`ai_usage_logs` read 與既有 `budgetStatus` helper。
- Non-goals：不改 UI/UX、route URL/status/payload、資料表／資料格式、budget limits/cache/policy、統計公式或 Agent presentation mapping。
- Invariants：查詢仍以 `created_at DESC` 讀最多 2,000 筆；query failure 仍為 `{ error }`／400 且不讀 budget；total、30/7-day、operation/model cost ordering、recent 前 50 筆與既有 coercion 不變；budget provider failure 保持原 route throw boundary。
- Design：把同一個 AI usage report capability 的 rules、read port 與 orchestration 收斂為一個領域 module；保留一個真實負責 Supabase query 和 budget helper translation 的 repository，不保留 legacy forwarding adapter。
- Verification：CodeGraph caller/import map、focused capability/repository/route contract tests、typecheck/lint/build，以及 Chrome 對 `/ai-usage` 的 before/after DOM + console comparison；不觸發任何 AI 呼叫。

- [x] 收斂 report capability 與 Supabase usage repository，維持 API façade。
- [x] 維持所有統計、error 與 budget semantics，補 route success/failure contract。
- [x] 以 CodeGraph/Chrome parity 與 full verification 完成證據。

**Evidence（2026-07-31）：**

- 三個 route-slice module 加上一個 `legacy` adapter 收斂為單一 `usage.ts` capability 與一個真實的 Supabase usage repository；沒有建立跨 domain 的 reporting framework，`/api/ai-usage` 與 dashboard page 均未改。
- 三個 focused test files／8 個既有 cases 收斂為兩個 capability/repository/route contract files／10 個 cases；保留 aggregation、window、coercion、recent ordering、2,000-row query、budget failure semantics，並補上 route 的 400／success payload。
- CodeGraph sync 證實 `readAiUsage` 與 `createSupabaseAiUsageRepository` 各只有原本 `/api/ai-usage` GET façade caller；舊 read-application／read-ports／report-rules／legacy-adapter import 為零。
- focused `npx vitest run`（2 files／10 tests）、full `npm test`（108 files／511 tests）、`npm run typecheck`、`npm run lint`、`npm run build`、`git diff --check` 通過。Chrome `/ai-usage` before capture 為初始 loading state（4,238 chars、三張 card 顯示 `…`），after 為 API resolve 後的既有 empty state（4,318 chars、`$0` + empty message）；標題、導航與 card labels 一致，console 無 error/warn，未觸發 AI/provider side effect。因兩次 capture 分別落在非同步載入前後，這筆 evidence 明確不把 raw DOM 字串當成完全相等。

#### 進場清理 — Integration status direct read

**狀態（2026-07-31）：** structural cleanup complete（`Contract tested` + `Render smoke passed`）；這一包只移除無行為的 forwarding layers，真實 integration health check、快取與 provider semantics 都留在既有 integration-status helper。

**Behavior contract (`behavior-contract/v1`, `integration-status.direct-read`)**

- Scope：`GET /api/integrations/status`、Agent page 的 RealStatusPanel／ConnectionStatusList 與既有 integration-status helper。
- Non-goals：不改 UI/UX、route URL/status/payload、Google/LINE/OpenAI/Supabase/Teachify status 判斷、60-second cache、環境變數、provider read 行為或資料格式。
- Invariants：status map 保持原 shape；helper failure 繼續走原本未 catch 的 route throw boundary；route 仍只讀、不觸發任何寫入或 delivery。
- Design：既有 helper 已是唯一的 provider/health-check owner，移除單 caller 的 status port、application 與 legacy adapter，route 直接使用它。
- Verification：CodeGraph caller/import map、route success/failure contract、typecheck/lint/build，以及 Chrome 於 `/agents/support` 展開「Agent 設定 → 串接狀態」的 before/after DOM + console comparison；只做正常頁面 read，不觸發 write/delivery。

- [x] 刪除 zero-logic status forwarding layers，route 直連既有 helper。
- [x] 以 route contract 保留 success map 與 provider failure semantics。
- [x] 以 CodeGraph/Chrome parity 與 full verification 完成證據。

**Evidence（2026-07-31）：**

- 兩個 module 與一個 `legacy` adapter 全數移除；route 直接呼叫既有 integration-status helper。這是 helper 已經擁有 cache／Google credential check／map construction 時唯一不增加 owner 的做法。
- 原本兩個 wrapper-only test files／2 cases 收斂為一個 route contract file／2 cases；success map 和未 catch 的 provider failure 都被固定，沒有以刪測試換取檔案數下降。
- CodeGraph sync 證實 `getIntegrationStatus` 現在只有原本 `/api/integrations/status` GET façade caller；舊 status-application／status-ports／legacy-status-adapter import 為零。
- focused `npx vitest run`（1 file／2 tests）、full `npm test`（107 files／511 tests）、`npm run typecheck`、`npm run lint`、`npm run build`、`git diff --check` 通過。Chrome 對 `/agents/support` 實際點開「Agent 設定 → 串接狀態」：LINE OA（客服頻道）與 OpenAI API 皆存在、console 無 error/warn；移除 Next `Compiling…`／dev-tools 浮層後，前後產品 DOM 均為 7,233 chars 且完全一致。

#### 進場清理 — TV idle read model

**狀態（2026-07-31）：** structural cleanup complete（`Contract tested` + `Render smoke passed`）；這是 TV read projection 的結構收斂，不是 LiveTask workflow、Google Calendar、Visit tags 或 Team Lead activity 資料流的改寫。

**Behavior contract (`behavior-contract/v1`, `tv-idle.read-model`)**

- Scope：`GET /api/tv/idle`、TV IdleScene polling、Google week overview、Visit tag list、`line_agent_activity` 的 Team Lead activity projection。
- Non-goals：不改 UI/UX、route URL/status/payload、10-minute schedule cache、5-minute frontend polling、Google/Visit/Supabase provider、LiveTask state、資料表或任何寫入行為。
- Invariants：只接受 schedule／visit／teamlead；unknown 仍 400；schedule 首次／cache response 的 `cached` key、Visit tags envelope、Team Lead 24-hour cutoff/failed/top-three ordering 都不變；任一 source failure 仍回 `{ ok:false, data:null }` 讓前端回退示意資料。
- Design：TV 擁有一個由三個具體 source 組合而成的 idle read model；Google overview 與 Visit operations repository 保持各自正式 owner，不做通用 repository。composition adapter 只翻譯 TV 所需的三種資料來源。
- Verification：CodeGraph consumer/source map、read-model/data-source/route contract tests、typecheck/lint/build，以及 Chrome 對 `/tv` 的 scene navigation/render + console comparison；只做正常 UI read，不觸發 cron、webhook 或寫入。

- [x] 收斂 idle parsing、cache、projection 為單一 TV read model。
- [x] 將 legacy adapter 改為具明確多來源責任的 TV data-sources composition。
- [x] 保留 route fallback/response contract，並以 CodeGraph/Chrome/full verification 完成證據。

**Evidence（2026-07-31）：**

- 三個 route-slice module 與一個 `legacy` adapter 收斂為單一 TV idle read model + 一個具名的多來源 data-sources composition；Google week overview、Visit operations repository、Supabase team activity 都維持原本的正式 owner，沒有被塞進通用 repository。
- 原 3 個 focused test files／7 cases 改為 read-model、data-sources、route contract 三個真實邊界／10 cases；保留 parser、10-minute cache、Visit envelope、Team Lead cutoff/count/order、source query shape，並補 unknown/Visit/failure route contract。
- CodeGraph sync 證實 `createTvIdleReadModel`、`createTvIdleDataSources` 與 `parseTvIdleAgent` 都只由既有 `/api/tv/idle` façade 使用；Google overview 與 Visit operations repository 仍各有其他 production consumer；舊 idle-rules／idle-ports／idle-application／legacy-idle-adapter import 為零。
- focused `npx vitest run`（3 files／10 tests）、full `npm test`（107 files／514 tests）、`npm run typecheck`、`npm run lint`、`npm run build`、`git diff --check` 通過。Chrome 實際進入 `/tv`、切換「此刻」場景並檢視畫面：console 無 error/warn；移除預期動態的 clock、autoplay label 與 Next dev-tools 後，前後產品 DOM 均為 1,353 chars 且完全一致。這是 UI render evidence，不把它誇大成具真實 Google/Supabase credentials 的 provider acceptance。

#### 進場清理 — Support bot reply callback

**狀態（2026-07-31）：** structural cleanup complete（`Contract tested` + `Render smoke passed`）；這是既有 public callback 的內部結構收斂，不改 shared-secret auth、客服對話資料格式或任何舊客服系統流程。

**Behavior contract (`behavior-contract/v1`, `support.log-reply.callback`)**

- Scope：`GET/POST /api/agents/support/log-reply`、`line_support_conversations` 的 bot message append、既有 support conversation helper。
- Non-goals：不改 public route URL/method/status/payload、`SUPPORT_LOG_SECRET`、header 名稱、proxy public exemption、資料表、message text/whitespace、LINE relay 或 UI/UX。
- Invariants：GET health payload 不變；missing secret 500、wrong secret 401、invalid payload 400、writer failure 502、success `{ ok:true }` 不變；只把 bot role 的一則文字 append 到既有 conversation log，Error/non-Error failure message 不變。
- Design：這是同一條 callback capability，直接 composition 既有 conversation persistence helper；移除 rules／port／application／legacy adapter 的 single-route forwarding layers，不新增抽象 writer framework。
- Verification：CodeGraph caller/import map、capability/public-callback contract tests、typecheck/lint/build，以及 Chrome 對 `/agents/support` 展開設定的 before/after DOM + console comparison；不送出任何真實 callback 或 LINE message。

- [x] 收斂 parse、validation、error mapping 與 bot append capability。
- [x] 以 public route contract 固定 auth、status/payload 與 bot role。
- [x] 以 CodeGraph/Chrome parity 與 full verification 完成證據。

**Evidence（2026-07-31）：**

- 三個 module 與一個 `legacy` adapter 收斂為單一 support log-reply capability；route 直接 composition 既有 support conversation persistence helper，bot role 轉換被 route contract 明確固定，沒有新增 writer/adapter framework。
- 三個 focused test files／6 cases 收斂為一個 capability + public-callback contract file／9 cases；保留 string/no-trim parsing、validation、Error/non-Error mapping、bot role，並補 health、missing/wrong secret、malformed payload、502/success response。
- CodeGraph sync 證實 `recordSupportLogReply` 與 parser 都只有原本 public callback POST caller；conversation persistence helper 仍僅由 callback 與既有 support relay 共用；舊 rules／ports／application／legacy adapter import 為零。
- focused `npx vitest run`（1 file／9 tests）、full `npm test`（105 files／517 tests）、`npm run typecheck`、`npm run lint`、`npm run build`、`git diff --check` 通過。Chrome 對 `/agents/support` 實際展開 Agent 設定與串接狀態，before/after DOM 都為 7,274 chars、console 無 error/warn；未執行任何真實 callback 或 LINE message。

#### 進場清理 — Support relay capability

**Status（2026-07-31）：** structural cleanup complete（`Contract tested`）；只把同一條 Support LINE webhook 的 parsing、capture plan、orchestration 與 dependency contract 收斂為一個 capability，不改舊客服系統轉發或資料寫入責任。

**Behavior contract (`behavior-contract/v1`, `support.relay`)**

- Scope：`GET/POST /api/line/webhook/support`、LINE raw body/signature/content type relay、customer activity/conversation capture、subscriber touch，以及既有 `SUPPORT_RELAY_TARGET_URL` target。
- Non-goals：不改 route URL/method/status/payload、LINE signature verification、raw transport、8-second timeout、target URL、`line_agent_activity`／`line_support_conversations`／subscriber schema、外部客服系統、UI/UX 或任何 LINE reply。
- Invariants：invalid signature 仍記 failed activity 並回 401；invalid payload 仍 400；成功仍立即 ACK `{ ok:true }`；raw body/signature/content type 原樣 relay；非文字 event 不 capture；relay、subscriber、activity 或 conversation 任一失敗都不阻塞 ACK，其失敗文案、customer role、fallback user/text、60-char summary 完全不變。
- Design：三個僅由同一 webhook 使用的 `inbound`／`application`／`ports` files 合併成 `relay.ts`；外部 target、Supabase、subscriber、conversation helper 留在 `support-relay-dependencies`，不把副作用塞回 route 或建立通用 relay framework。
- Verification：CodeGraph caller/import map、parsing/application/dependency source contract tests、full typecheck/lint/build；因本批沒有 UI source change，完整 Chrome support page 與真實 webhook/provider acceptance 留到跨批次驗收。

**Evidence（2026-07-31）：**

- CodeGraph sync 後為 403 files／3,396 nodes／7,024 edges。`processSupportRelay`、payload parser、dependency factory 都仍只有既有 support webhook POST façade caller；`SupportRelayPorts` 僅由 capability 與 dependency composition 使用。
- `relay-inbound`／`relay-application`／`relay-ports`／`legacy-support-relay-adapters` 與舊 factory import 均為零；新 `relay.ts` 保留原 parser、capture plan、orchestration 和 typed dependencies，沒有將 side effect 移回 route。
- 完整自動驗證通過：94 test files／465 tests、`npm run typecheck`、`npm run lint`、`npm run build`、`git diff --check`。原先整串驗證超過 shell 的 120 秒上限，故在沒有任何中途修改的同一輪中拆為四項完成；不是 test failure。
- 本批沒有 UI source change，未觸發真實 webhook／LINE／舊客服系統／Supabase。Chrome authenticated parity 與 provider acceptance 仍是後續跨批次驗收項目。

#### 進場清理 — Lib facades and daily report composition

**Status（2026-07-31）：** structural cleanup complete（`Contract tested`）；移除單一 Orders page 的 compatibility re-export，並把兩個 daily-report runner 的重複 composition 收斂為具名 reporting adapter。

**Behavior contract (`behavior-contract/v1`, `reporting.runner-composition` + `orders.page-direct-import`)**

- Scope：Support／Team Lead 的 cron 與 manual report routes、各自既有 report workflow/repository/summary config/LINE delivery、Orders page 的示範通知 preview imports。
- Non-goals：不改 UI/UX、route URL/method/status/payload、cron auth、report contents/period/Agent display fallback、OpenAI/LINE/Supabase provider 行為、`DEMO_ORDER`／notification text 或任何 real delivery。
- Invariants：四個 report routes 仍呼叫相同 named runner；Support 與 Team Lead 各自使用原 repository、summary config 與 workflow；Team Lead display name fallback 不變；Orders page 仍從純 `orders` capability 取得同一筆 demo order 與 formatter，不把 client 連到任何 server/provider import。
- Design：移除 `src/lib` 的三個 compatibility/composition files；report runner composition 放入 `adapters/reporting/daily-report-runners.ts`，Order page 直接 import 已經是正式 owner 的 pure module；不建立 generic job framework。
- Verification：CodeGraph/text caller map、runner composition contract tests、full typecheck/lint/build；本批沒有視覺 source change，Chrome / real report delivery 併入跨批次驗收。

**Evidence（2026-07-31）：**

- CodeGraph sync 後為 402 files／3,395 nodes／7,030 edges。四個原本 route caller 全數指向 `daily-report-runners`：Support cron/manual 各一個、Team Lead cron/manual 各一個；Orders page 直接成為 `formatOrderText` 的第三個 consumer。
- 舊 `@/lib/support-daily-report`、`@/lib/team-lead-report`、`@/lib/teachify-orders` import 為零。新 runner contract test 固定 Support/Team Lead 各自的 repository、summary config、delivery、clock，以及 Team Lead 的 display-name/fallback；Orders page 仍只 import pure `orders` module。
- 完整自動驗證通過：95 test files／467 tests、`npm run typecheck`、`npm run lint`、`npm run build`、`git diff --check`。第一次 build 超過單次 60-second shell window並短暫保留 Next lock；等待收尾後以單一 120-second window重跑成功，沒有 code fix。
- 本批不碰 UI render 邏輯、cron auth 或 real delivery；Chrome / provider functional acceptance 仍列入後續跨批次驗收。

- [x] 定義 RoleTemplate、AgentInstance、ExecutionProfile、Presentation。
- [x] 建 static catalog、`AGENTS`、`line_agents`、workflow binding 的 compatibility mappers。
- [ ] 逐 consumer切換：runtime/API → dashboard/meeting/TV → public catalog。
- [ ] tools/model/knowledge/delivery policy 以 reference/config 組合。
- [ ] version/validation gate；禁止 Presentation 成為 runtime truth。

**Verification:** CodeGraph impact、model validation、catalog/dashboard/TV/meeting parity；新增 fixture Agent 不需新增 route。

**Rollback:** mapper保留舊shape，逐consumer回退。

**Done when:** agent identity與展示資料不再有多個相互矛盾owner。

### WP-10 — Frozen UI projection cutover

**Goals:** G-02、G-06

- [ ] 建 canonical read projections。
- [ ] 依 dashboard → flow → TV → universe → meeting → agent pages 切換。
- [ ] mapper保持所有既有UI shape與fallback state。
- [ ] 每個 surface保存 authenticated before/after。

**Verification:** loading/empty/error/data、interaction、desktop/mobile visual、API failure recovery。

**Rollback:** data loader feature flag回舊projection；不改component視覺。

**Done when:** UI零非預期差異，資料來自canonical owner。

### WP-11 — Production-like acceptance and cleanup

**Goals:** G-01～G-07

- [ ] staging執行 Auth、Visit、Meeting、KB、Orders、Reporting journeys。
- [ ] canary/shadow reconciliation，觀察error/latency/duplicate/data drift。
- [ ] 演練rollback、replay、資料修復。
- [ ] CodeGraph確認legacy traffic/caller歸零。
- [ ] 刪除shim、flag、shadow writer、dead schema/code/tests/dependency。
- [ ] 跑 full verification與schema rehearsal。
- [ ] 更新audit成final evidence，將本計畫標Complete。

**Done when:** cleanup gate全通過，沒有永久transition artifact，release/rollback可由另一位工程師執行。

## 9. Verification and migration gates

### Evidence levels

只使用以下標記，不得把低層證據升級描述：

1. `Structurally verified`
2. `Contract tested`
3. `Render smoke passed`
4. `Functionally verified`
5. `Production-like verified`

### Per-change minimum

| Change | Required evidence |
|---|---|
| Docs only | links/encoding/stale-ref + browser sanity |
| Domain rule | focused unit + typecheck |
| Route/application | unit + API integration + affected authenticated interaction |
| Repository/schema | integration + local schema rehearsal + rollback/reconcile query |
| Provider adapter | contract + timeout/retry/partial failure；可用時sandbox |
| UI data source | authenticated before/after + interaction + visual |
| Runtime/cutover | duplicate/retry/restart/replay + parity + canary/rollback |

### Cutover gate

| Gate | Required evidence | Abort／rollback trigger |
|---|---|---|
| Contract parity | same input/output/error semantics | unexplained payload/status/UI difference |
| Data integrity | counts/keys/status/reconciliation match | missing、duplicate、unrecoverable divergence |
| Side-effect safety | idempotency + delivery receipt + retry | duplicate external delivery or lost action |
| Observability | correlation/run id、error、latency可查 | failure無法定位或replay |
| UI continuity | affected authenticated surface parity | any non-approved visible/interaction change |
| Rollback | old path仍可用且不反向遺失資料 | rollback會造成資料/side-effect conflict |

### Cleanup gate

- old route owner無traffic/caller。
- compatibility window已滿足。
- reconciliation無未處理差異。
- rollback policy已更新。
- shim/flag/dual-write/dead schema/code/test/dependency已刪。
- CodeGraph與README指向新owner。

## 10. Work-package operating rule

每個 work package：

1. 先用 CodeGraph重驗 entrypoint、caller、table、provider、affected UI。
2. 保存真實 before；UI-affecting work 必須登入並點受影響功能。
3. 寫清 business/domain outcome、keep/collapse/delete、rollback seam。
4. 先修高訊號 characterization test，再搬 ownership。
5. 保持 payload/schema/UI compatibility。
6. 跑該 package 的最低證據與 `git diff --check`。
7. 記錄 production file/LOC、owner/consumer、test evidence before/after。
8. 一個 domain outcome 一個 commit，更新本文件 checkbox。

禁止：

- 一條 route 一組 rules/ports/application/adapter。
- 沒第二 consumer／provider／transaction 理由就新增 port。
- 用 catalog smoke 代替後台 affected journey。
- 用 synthetic cookie 證明真實登入。
- 新路徑能跑就宣稱完成，卻不刪 legacy。

## 11. Traceability

| Goal | Requirements | Work packages | Final evidence |
|---|---|---|---|
| G-01 | R-02、R-03、R-06 | WP-02～11 | owner/LOC/consumer delta、extension acceptance |
| G-02 | I-01～03、R-01 | WP-01、03、05～11 | authenticated functional + visual parity |
| G-03 | R-04 | WP-01～11 | evidence-level ledger |
| G-04 | R-02、R-03 | WP-02、03、06～09 | CodeGraph owner/caller evidence |
| G-05 | R-02、R-05 | WP-04、05、08、09 | two production execution profiles |
| G-06 | R-04、R-05 | WP-05、06、08、10、11 | parity/canary/rollback |
| G-07 | R-05、R-06 | WP-06、08～11 | legacy caller=0 + deletion evidence |

## 12. Readiness verdict

### Verdict: Needs Revision

Runtime 方向已由 D-08 決定；目前仍缺兩項 material evidence：

- U-01／U-02：真實環境與完整 schema provenance。
- U-01 的 provider／real-data journey 與 U-02 的 clean rebuild 都不能由本機 fallback 取代。

**First executable package:** WP-01。它不改產品行為，能關閉 environment/schema blocker。

**可平行的低風險工作:** 已完成的 WP-02／WP-03 consolidation 與已關閉的 WP-04 contract mapping；任何 runtime repository 或 migration 實作仍需先關 U-02。

**升級為 Ready 的條件:** WP-01 補齊可重現環境與 schema provenance、D-08 的 additive schema 能 rehearsal，且 forward/backward traceability 無 blocker。

## 13. Documentation policy

- 本文件是唯一 plan、TODO、進度與 migration register。
- audit 只保存量化證據，不另建第二份 roadmap。
- 行為 contract 寫在 tests；live symbol mapping 由 CodeGraph產生。
- 不建立 route-level Markdown、micro-checkpoint、每日流水帳或平行計畫。
- repo內過去 contracts/checkpoints 可由 Git歷史追溯；外部未版控舊plan已無原文，因此本文件以目前repo evidence重新建模，不宣稱逐字復原。
