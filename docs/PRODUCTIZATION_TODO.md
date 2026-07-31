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
| Branch／snapshot | `codex/kv-wp0-toolchain`／`996a4e0` |
| Merge base | `359d4c98035267df2711a376a439fdbc5720cc76` |
| Last verified | 2026-07-31；CodeGraph index 4,465 nodes／8,967 edges |
| Requirements source | 本對話：產品化、UI／UX 不變、沿用現有資料格式、可維護可擴充 |
| Known drift | 本計畫之後若 route、schema、public contract、runtime owner 或測試入口有變，開工前重跑 CodeGraph preflight |
| Readiness | **Needs Revision**；WP-01 與 WP-02 可執行，但真實環境與 runtime schema reconciliation 尚未關閉 |

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
- 既有 runtime persistence 與新 `platform/runtime` 的 reconciliation。
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
| F-04 | `RuntimeKernel` 沒有 production caller，只有 runtime unit tests；repository 是 in-memory | `src/platform/runtime/kernel.ts`、`in-memory.ts` | 禁止先擴寫 generic runtime |
| F-05 | `agent_runs`、`agent_run_steps`、`agent_artifacts` 已有 migration 與 Supabase helper；Visit 已透過 `visit-run.ts` 使用 | `20260725_agent_runtime_core.sql`、`agent-runs.ts`、`visit-run.ts` | 新 kernel 必須與現有 schema／behavior reconciliation |
| F-06 | 新 `RunRecord` 要求 workflow/deployment/correlation/version 等欄位，既有 `agent_runs` schema 使用 agent_slug/trigger/status/meta | runtime contracts vs runtime migration | target schema 尚未決定，屬 material Unknown |
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

目前 platform runtime
RuntimeKernel
  → RuntimeRepository / OutboxRepository
  → InMemory repositories
  → unit tests only
```

目標不是讓兩套永久共存，也不是丟掉已運作的 schema。必須先決定如何以 compatibility mapper／repository 將既有 production path 收斂到 canonical runtime。

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
| DM-08 Runtime／workflow | `agent-runs.ts` production helper、Visit legacy runtime adapter；isolated `platform/runtime` | existing agent_* tables；new in-memory repo/outbox contract | canonical runtime repository/kernel adopted by vertical slices | 先 reconciliation，不新增空泛 contract；最終刪除 direct DB helper或讓它成唯一 compat adapter | schema mapping決策、Supabase repository、restart/resume/idempotency/outbox；兩種 profile production consumers |
| DM-09 Agent model | `agent-data.ts`、`agent-catalog.ts`、DB `line_agents`、workflow execution profiles、TV/page local shapes | static TS + `line_agents` | ProductOffering／RoleTemplate／AgentInstance／ExecutionProfile／Presentation | 先 mapper 不改 UI；逐 consumer cutover；最後刪除重複 truth | catalog/dashboard/TV/meeting parity；新增 Agent 不需複製 route；old owner caller=0 |
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
| U-03 | 新 RuntimeKernel 應直接映射既有 `agent_*` tables，或需 additive schema extension | WP-04 | runtime implementation、Visit cutover | timeboxed reconciliation；優先 compat mapper，只有缺失能力才 additive migration |
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

### WP-02 — Operations consolidation pilot

**Goals:** G-01、G-03、G-04

**Anchors:** `modules/{goals,checklist,subscribers,contacts,activity}`、對應 adapters/routes/UI。

- [x] CodeGraph 建 consumer map與 boundary allowlist/collapse list。
- [x] Goals 收斂 read/update/delete/reset/history 到單一 domain service + repository。
- [x] Checklist 收斂 read/update。
- [x] Subscribers 收斂 read/update，broadcast 保留為 application use case。
- [ ] Contacts/Activity 建共享 repository/read model，不複製 query port。
- [ ] route 只保留 parse/auth/HTTP mapping（Goals／Checklist／Subscribers 已完成，其餘 domain 待辦）。
- [ ] 刪除 forwarding applications、single-consumer ports、alias adapters與低訊號 tests（Goals／Checklist／Subscribers 已完成，其餘 domain 待辦）。
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

**Verification:** focused rules/repository integration、API parity、authenticated Todos/Subscribers/Outputs/TV interactions、CodeGraph dead caller scan。

**Rollback:** 每個 domain 一個 commit；回退該 domain，不共用未驗證 global rewrite。

**Done when:** 這些 domain 無逐 route 四件組，檔案/owner 減少且功能證據不退步。此結果是後續 consolidation template。

### WP-03 — Knowledge Base consolidation

**Goals:** G-02、G-03、G-04

**Anchors:** DM-03 的 routes/modules/adapters、`lib/{knowledge-base,kb-import,kb-crawl,kb-search}.ts`.

- [ ] 依 capability 分成 document repository、access policy、ingestion、crawl provider、index/search。
- [ ] 合併 CRUD/import action-specific ports與applications。
- [ ] 將 Supabase rows、Firecrawl、embedding/OpenAI translation 留在 adapters。
- [ ] 定義 upload→preview→publish/discard→index state/failure map。
- [ ] 保持既有 API payload與KB頁面狀態。
- [ ] legacy helper caller 歸零後刪除或降為唯一 adapter。

**Verification:** CRUD、access、upload、crawl、publish/discard、reindex integration journeys；bad file/provider failure；authenticated KB desktop/mobile parity。

**Rollback:** route-level compatibility façade 可回接 legacy owner，未完成前不改 schema contract。

**Done when:** KB capability 有唯一 owner，39 modules/13 adapters 不再按 route action 分裂。

### WP-04 — Runtime schema and contract reconciliation

**Goals:** G-03、G-05

**Unknown:** U-03

**Anchors:** `platform/{events,runtime,workflows,artifacts}`、`lib/agent-runs.ts`、`lib/visit-run.ts`、runtime migration.

- [ ] 列出 existing schema ↔ `RunRecord/Event/Outbox` field map。
- [ ] 比較三個方案：A. kernel mapper到既有表；B. additive columns/tables；C. 收斂kernel contract到既有模型。
- [ ] 以 Visit text、Orders webhook、scheduled report 三種 profile 驗證必要欄位。
- [ ] 決定 idempotency、CAS/version、lease、outbox、event persistence 的最低 production slice。
- [ ] 在本 TODO 更新 Decision、target map、migration/rehearsal與rollback。
- [ ] 未決前禁止新增 generic node kind、tool registry 或無 consumer schema。

**Verification:** schema rehearsal、repository contract tests、restart/duplicate/CAS/outbox failure cases。

**Fallback:** 優先 compatibility mapper；若 existing schema 不足，才建立 additive migration，舊 writer 仍可運作。

**Done when:** U-03 關閉，WP-05 實作者不需猜 schema/owner；此時整份 plan 才可候選 Ready。

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

- [ ] 將 start/command/realtime/log/recording/speak/transcribe/finish 收斂成 Meeting session use cases。
- [ ] storage、OpenAI realtime、audio/transcription 分成 provider adapters。
- [ ] 統一 meeting/turn lifecycle、failure與cleanup。
- [ ] 保持 meeting page request/response與UI state。

**Verification:** start→command/voice→turn→finish、recording upload/read、provider timeout/error、authenticated visual/interaction。

**Rollback:** API façade 可回接 legacy function；storage/schema change 必須 additive。

**Done when:** route-specific四件組移除，session lifecycle唯一且可測。

### WP-08 — Orders and Reporting production slices

**Goals:** G-03～G-06

- [ ] Teachify event normalize、signature/payload contract、duplicate suppression。
- [ ] order persistence與notification用 transaction/outbox semantics。
- [ ] scheduled/manual report 共用同一 generation workflow。
- [ ] report artifact與delivery receipt可追溯到run。
- [ ] 第二種 execution profile 重用 WP-04/05 runtime，驗證抽象不是 Visit 特例。

**Verification:** duplicate/invalid webhook、partial provider failure、same-period cron dedupe、artifact parity、replay；Orders/Support dashboard actions。

**Done when:** 至少 short-event + scheduled-batch 共用canonical runtime；legacy Orders/Reporting owner可刪。

### WP-09 — Canonical Agent model

**Goals:** G-01、G-04、G-05

- [ ] 定義 ProductOffering、RoleTemplate、AgentInstance、ExecutionProfile、Presentation。
- [ ] 建 static catalog、`AGENTS`、`line_agents`、workflow binding 的 compatibility mappers。
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

不是方向未決，而是兩項 material evidence 尚未取得：

- U-01／U-02：真實環境與完整 schema provenance。
- U-03：既有 production runtime schema 與新 kernel contract 的收斂決策。

**First executable package:** WP-01。它不改產品行為，能關閉 environment/schema blocker。

**可平行的低風險工作:** WP-02 的 CodeGraph collapse inventory；實際修改需等 authenticated baseline。

**升級為 Ready 的條件:** WP-01 完成、WP-04 reconciliation decision 寫回本計畫，且 forward/backward traceability 無 blocker。

## 13. Documentation policy

- 本文件是唯一 plan、TODO、進度與 migration register。
- audit 只保存量化證據，不另建第二份 roadmap。
- 行為 contract 寫在 tests；live symbol mapping 由 CodeGraph產生。
- 不建立 route-level Markdown、micro-checkpoint、每日流水帳或平行計畫。
- repo內過去 contracts/checkpoints 可由 Git歷史追溯；外部未版控舊plan已無原文，因此本文件以目前repo evidence重新建模，不宣稱逐字復原。
