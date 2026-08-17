# KV 產品化控制計畫

> 這是唯一現行計畫、TODO、架構決策入口與 readiness 判定。Git、測試、CI、runtime 與 CodeGraph 保存歷史證據；本文件只保留會改變下一步的內容。

## 1. 計畫身分

| 欄位 | 內容 |
|---|---|
| Lifecycle | Active |
| Profile／release intent | Standard／production slice |
| Owner | CabLate engineering；產品範圍由 CabLate product owner 決定 |
| Repository／branch | `F:\ownproject\kv`／`codex/kv-wp0-toolchain` |
| Planning base | `69132b9`（P0-P9 收尾基準） |
| Last verified | 2026-08-17；source、CodeGraph、P0～P9 handoff evidence |
| Readiness | Ready；先執行 N1，不得跳過設定真相直接建立 runtime platform |

開始或恢復工作時：

1. 確認 HEAD、branch 與 dirty worktree。
2. 用 CodeGraph 找受影響 entrypoint、caller、owner；再讀 current source 與 tests。
3. 若 drift 改變設定格式、workflow owner、provider side effect 或部署方式，先修本文件與下游 package。

## 2. 下一階段要達成什麼

工程團隊要能在不複製 route／domain module、不改既有 UI／UX 的前提下，為不同企業調整 Agent 設定、workflow 組合與 provider 連線。每個變化都要有型別、版本、owner、驗收與回復方法。

成功時可以觀察到：

- 現有設定有單一 schema 與預設值；舊 `line_agents.settings` 仍可讀，錯誤設定不會靜默進入 runtime。
- Agent role、Agent instance、event、workflow 與 provider connection 各自只有一種責任。
- 現有 workflow 可由 versioned code definition 定位，但業務規則仍由原 domain module 持有。
- 第一批客戶採每企業獨立 app、Supabase 與 provider keys；不靠複製程式碼製造客製版。
- 新需求只整理實際碰到的 legacy owner；檔案數與抽象層不會因儀式繼續膨脹。
- 排程與 provider 故障可以定位到明確 owner；沒有證據前不建立通用 retry、queue 或 workflow engine。

## 3. Goal 與不可破壞的邊界

### Actors and goals

| Goal | Actor／job | 可觀察成果 |
|---|---|---|
| G-01 Primary | 工程團隊承接企業需求 | 新增核准的設定或 workflow 變化時，不複製 route／module，也不改無關功能 |
| G-02 Supporting | 導入工程師配置每家企業 | 依同一份 schema、部署 profile 與 provider checklist 完成獨立部署 |
| G-03 Supporting | 後台操作人員使用既有畫面 | UI、API 與資料相容；錯誤設定會顯示可處理的錯誤，不會假裝成功 |
| G-04 Enabling | 維護者診斷與修復 | 從 event／workflow run／provider receipt／cron ledger 找到失敗 owner 與 recovery 方法 |

### Quality guardrails

- 每個新抽象至少具備兩個 production consumers，或真的持有 provider translation、transaction、concurrency、idempotency、recovery、非平凡 mapping 或多副作用 orchestration。
- UI／UX、既有 API URL、主要 JSON response、Main／Teaching ownership 與 provider side-effect 順序預設不變。
- 設定資料可以演進，但每次變更必須有 backward-compatible parser、版本策略或明確 migration。
- 每個 package 一個 coherent commit；便宜驗證隨改隨跑，完整 browser／provider／staging 驗證集中在 domain 邊界。

### Non-goals

- 任意 low-code／JSON DSL workflow editor。
- plugin marketplace、microservices、universal retry 或先建 queue。
- 現在導入 multi-tenant schema、billing、RBAC 或共享 credential vault。
- 一次搬完 `src/lib`、一次拆完大型 page，或為減少 LOC 做水平重構。
- 改版 UI、合併 Main 與 Teaching DB、移除 Support relay。

## 4. 已確認的現況

### Current flow

```text
Agent pages / AgentPageShell
  -> PATCH /api/agents/[slug]
  -> modules/agents/admin（只確認 settings 是 object）
  -> Supabase agent repository（只確認可序列化 JSON）
  -> line_agents.settings

Runtime consumers
  -> Visit / Orders / Support / Reporting 各自手動讀 key、套預設值
  -> domain use case
  -> provider / repository adapter
```

| Fact | Stable anchor | 對下一步的影響 |
|---|---|---|
| `line_agents.settings` 是目前 deployment setting truth，型別為任意 JSON | `modules/agents/admin.ts`、`supabase-agent-admin-repository.ts`、`database.types.ts` | 先保留 storage；在 read／write boundary 加 schema，不先改 DB |
| Agent pages 以 `Record<string, unknown>` 傳設定，各頁自行載入與判斷欄位 | `AgentPageShell.tsx`、`app/(dashboard)/agents/*/page.tsx` | N1 必須盤點實際 keys、defaults、consumer，避免 schema 猜測 |
| Visit 已有獨立 `VisitSettingsPort`，但 adapter 仍手動轉型與預設 | `modules/visit/settings-ports.ts`、`adapters/visit/supabase-visit-settings.ts` | 可作第一個 typed-config slice；不再包一層 forwarding interface |
| Orders、Support、Team Lead 直接把 settings cast 成 record 後讀 `reportTo`／`pushStyle` | `modules/orders/orders.ts`、`modules/support/report.ts`、`modules/reporting/team-lead.ts` | 共享 field 名稱不代表共享 workflow；schema 依 domain 持有，可重用窄 field schema |
| role／instance／binding 模型已存在，但目前 deployment 固定為 `legacy-static-registry`，bindings／capabilities 為空 | `modules/agents/identity.ts` | 這是 compatibility seam，不得宣稱已可動態編排；N3 才加入真實 bindings |
| domain modules／provider adapters 主幹已就位；`src/lib` 與 KB forwarding facade 仍有過渡 ownership | `src/modules`、`src/adapters`、`src/lib/kb-*` | 只在 N2／N3 或新需求碰到時 touch-and-migrate |
| Main DB、provider credentials 與 app runtime 都是 deployment-global | `lib/supabase.ts`、provider env readers、`.env.example` | 先採每客戶隔離部署；只加 `tenant_id` 不會變成 SaaS |
| P0～P9 已完成 staging、migration、backup／restore、Supabase Cron、CI、Chrome 與 rollback compatibility | README release runbook、CI run `31987861315`、commit `69132b9` | 下一階段不重做基礎建設；Teachify contract 已對齊，仍待真實 provider event |

## 5. 目標概念與責任

| 概念 | 負責什麼 | 不負責什麼 | 目前落點／目標 |
|---|---|---|---|
| Agent role | 穩定職責與可理解的身份 | event、部署 secret、UI 活動數字 | `AgentRoleTemplate`；先維持 code-owned |
| Agent instance | 某一 deployment 中啟用的角色與設定 | 定義 workflow 業務步驟 | `line_agents`＋`AgentInstance` compatibility seam |
| Event | webhook、cron、postback、request、realtime 等一次觸發 | Agent 類型或共用業務流程 | 現有 route／dispatcher contracts |
| Workflow definition | workflow id／version、trigger、execution profile、config schema 與 domain entrypoint | 搬走 domain policy或變成任意 DSL | N3 的 versioned code registry |
| Provider connection | deployment 使用哪個外部服務與連線狀態 | 放進 Agent settings 或前端 | 現有 env／secret store；N4 整理 deployment profile |
| Presentation projection | UI 名稱、角色文案、流程圖與 demo 顯示 | durable business truth | `agent-data`／catalog／briefings；UI 保持相容 |

## 6. 唯一執行順序

```text
Feature lane ───────────────────────────────────────────────→ 持續承接需求

N1 設定真相與變化矩陣
  -> N2 Typed settings boundary
      -> N3 Versioned workflow definitions / bindings
          -> N4 每客戶隔離交付模板

N5 touch-and-migrate ──只跟隨 N2／N3／真實需求碰到的 owner──→ cleanup
N6 provider／cron observability ──可在 N1 後平行，於 N4 前整合──→ acceptance
```

不得跳過 N1 直接做 N3。N2 不需要等待新客戶；N4 不需要等待 multi-tenant 決策。N5 不是全 repo 清理專案。

## 7. 六個工作包

### N1：建立設定真相與企業變化矩陣 `[next]`

**Contribution：** G-01、G-02、G-03。

**Scope anchors：** `line_agents.settings`、所有 Agent settings pages、Visit／Orders／Support／Reporting consumers、現有 unit／browser contracts。

**步驟：**

1. 逐 workflow 記錄 key、型別、預設值、允許範圍、read owner、write owner、runtime consumer 與敏感性；不把 `reportTo` 等相同名稱直接推成共同 workflow。
2. 把欄位分成 deployment-safe config、provider connection、secret、presentation-only 與不該可設定的 domain policy。
3. 用目前已存在的變化作 acceptance examples，例如 Visit `requireApproval`、時間範圍、通知對象與推播樣式；新增企業需求只能補進矩陣，不直接複製程式。
4. 為每組設定決定 schema owner、default owner、unknown-key policy、invalid-value policy 與版本策略。

**不改：** UI、DB schema、runtime side effect、provider credentials。

**驗證／Done When：** 每個被 runtime 使用的 key 都能指到一個 owner、consumer、default 與 failure behavior；沒有 secret 被歸進 Agent settings；N2 不需再猜 schema。

### N2：建立 workflow-owned Zod settings boundary `[pending]`

**Contribution：** G-01、G-03；依賴 N1。

1. 依 workflow 建立 Zod schema 與 inferred type；共用的只抽窄 field schema，不建立萬用 AgentSettings。
2. 在 API write boundary 驗證 slug 對應 schema；回傳相容且可理解的 4xx error。
3. 在 runtime read boundary parse 舊 JSON、套 canonical defaults；選定 unknown-key 的保留或拒絕策略。
4. Visit 先落地，再依真實 consumer 順序處理 Orders、Support／Team Lead 與其他現有 settings。
5. UI payload 與 `line_agents.settings` storage 形狀保持相容；除非 N1 證明需要，不新增 migration。

**驗證／Done When：** current rows 全部可 parse；invalid／missing／unknown cases 有 focused tests；Agent 設定頁保存與 reload 的 Chrome 行為不變；runtime 不再自行 cast 本批涵蓋的 settings。

**Rollback：** 回退 parser／write validation commit；DB JSON 未改形狀，不需 down migration。

### N3：加入最小 versioned workflow definition 與 binding `[pending]`

**Contribution：** G-01、G-04；依賴 N2 的 typed config。

1. 定義最小 `WorkflowDefinition`：id、version、trigger ids、execution profile、config schema id、domain entrypoint id；不描述每個 step 的任意 JSON。
2. 先映射有真實 runtime 的 Visit、Orders、Support；definition 只定位 owner，不接管 domain rules。
3. 讓 `AgentInstance.bindings` 從空陣列變成 deployment 可查的 code-owned binding；保留 `legacySlug` 相容。
4. event normalization 留在現有 route／dispatcher；provider adapter 留在 domain composition，不塞進 Agent role。
5. 只有第二個真實 consumer 需要管理 UI／DB catalog 時，才評估將 registry 移出 code。

**驗證／Done When：** 從任一代表性 event 可追到唯一 workflow version、config schema、domain owner 與 execution profile；三條 workflow 的既有 API、DB、provider 與 UI evidence 不變；沒有新增通用 engine／runner layer。

### N4：固定每客戶隔離的交付模板 `[pending]`

**Contribution：** G-02、G-04；依賴 N2，並使用 N3 bindings。

1. 將企業差異整理成 deployment profile：啟用的 Agent instances／workflow bindings、safe config、provider checklist 與 feature availability。
2. 每家企業使用獨立 app、Main Supabase、secret store 與 provider keys；Teaching 保持外部唯讀 connection。
3. `doctor`／integration status 分開顯示 configured、authenticated、authorized、write-enabled 與 safe-mode；不把 env presence 當完整 operational。
4. 建立不含 secret 的 profile 範例、安裝步驟與 acceptance matrix；沿用 README 的 migration、backup、schedule 與 rollback runbook。
5. 只有出現至少兩個活躍客戶且共享營運需求成立，才另開 tenant／RLS／request-scoped provider resolver 計畫。

**驗證／Done When：** 新環境可只靠 release artifact、profile、secret checklist 與 runbook 部署；同一 code commit 能以兩組非敏感 fixture profile 呈現不同啟用／設定組合；沒有 customer-specific source fork。

### N5：以 touch-and-migrate 控制 legacy 與過細抽象 `[pending]`

**Contribution：** G-01；跟隨 N2／N3 或 feature lane，不是獨立水平重構。

1. 每次改動前以 CodeGraph 確認 caller、impact 與 current owner。
2. 只搬本次需求碰到的 decision／side effect；`src/lib` 其他區域不順手搬家。
3. 合併 single-caller forwarding application／adapter；保留 provider translation、transaction、lock、idempotency、recovery 與多副作用 boundary。
4. KB facade 只在下一個真實 KB journey 時收斂；大型 Meeting／TV page 只在功能修改時抽 hook／component，UI 不變。
5. 每個 compatibility seam 要有 exit condition；沒有第二 consumer 的抽象不升級。

**驗證／Done When：** 本批新增需求能由單一 owner 定位；沒有新增 route-specific 四層樣板；刪除／合併有 caller evidence與 affected tests；檔案／LOC 只作警訊，不作 KPI。

### N6：補齊 provider／cron observability `[pending]`

**Contribution：** G-04；N1 後可平行，N4 acceptance 前整合。

1. 先列現有 provider／cron 的 operation name、correlation／run id、deadline、receipt、failure kind、reconcile owner 與成本資訊。
2. 排程沿用 Supabase Cron history、`kv_ops.schedule_dispatches` 與 `pg_net` response；加入明確通知目的地與 owner，不再建立 GitHub high-frequency schedules。
3. Provider 依副作用決定 timeout／retry／duplicate policy；LINE、Google、OpenAI、Firecrawl、Teachify 不共用一套盲目 retry。
4. 將 integration status 從「有 key」逐步提升為可分辨 configured／verified／operational；不回傳 secret。
5. 只有真實 timeout、吞吐或重播需求證明現有同步 runtime 不足時，才評估 queue／worker。

**驗證／Done When：** 代表性 provider failure 與 cron failure 能從紀錄找到 workflow、deployment、operation、failure owner 與 recovery；通知測試可控且不送到正式對象；正常 UI 不受影響。

## 8. Feature intake 與驗證規則

每個新需求：

1. 判斷它改的是 presentation、設定、domain rule、provider、reliability 或跨 domain contract。
2. 找 entrypoint、current owner、資料／provider、tests 與 UI；保存 before contract。
3. 優先重用既有 owner；碰 legacy 時只搬必要行為。
4. 若是企業差異，先補 N1 矩陣，再決定 config、workflow binding 或新 domain use case。
5. 便宜 gate 隨改隨跑；到 domain 邊界才跑完整 browser／provider／staging。
6. 一個 coherent outcome 一個 commit；更新本文件狀態，不新增平行 TODO。

| Claim | 最小證據 | 不能冒充的完成 |
|---|---|---|
| settings schema 正確 | current rows parse、invalid/default/unknown tests、API contract | 不等於 workflow 可配置 |
| workflow binding 正確 | event → version → owner trace、代表性 journey | 不等於 low-code engine |
| 企業 profile 可交付 | clean setup、doctor、migration、acceptance、rollback | 不等於 multi-tenant SaaS |
| ownership 改善 | caller／impact、forbidden dependency、affected regression | 不以檔案變少單獨判定 |
| observability 可用 | controlled failure、receipt／ledger、owner／recovery | 不等於所有 provider 都可安全 retry |

## 9. Decisions、外部 gate 與停止條件

| 項目 | 決定／狀態 | 阻塞什麼 | 不阻塞什麼 |
|---|---|---|---|
| Teachify provider truth | 官方 Loopwise header／payload contract 已確認並接入；secret 已由 owner 提供但本地／deployment configuration 尚未在此驗證；仍待真實 `payment.paid`／`payment.refund` event | Teachify 真實 provider 驗收與對客啟用 | N1～N6 其餘工作 |
| 第一個新產業客製需求 | 尚未提供；以 feature intake 加入 | 尚未定義的新 workflow 行為 | 現有 settings schema／workflow mapping |
| Multi-tenant | Deferred；需至少兩個活躍客戶＋共享營運需求 | shared SaaS runtime | per-customer isolated deployment |
| Generic workflow／queue／plugin | Rejected until proven | 任意平台能力 | versioned code definitions、domain use cases |
| Default `main` cutover | Repository governance decision | 正式 default-branch 切換 | 產品化 branch 的 N1～N6 |

停止抽象或結構重構的條件：下一個改動不能縮小需求 blast radius、移除 duplicate ownership、改善 failure diagnosis、關閉 material risk，或服務已知 consumer。達到條件就回到 feature lane，不為完成架構圖繼續拆。

## 10. Completed outcome ledger

| Outcome | Representative evidence | Result |
|---|---|---|
| P0～P7 現有功能接管、真實 journeys 與可靠性修復 | domain／provider tests、staging DB／LINE／Google／OpenAI／Firecrawl／Meeting／Chrome evidence | Done；Teachify contract 已對齊，真實 provider event 仍待驗收 |
| P7A upstream reconciliation | current-owner implementations 與 commit ledger，Git history 保存細節 | Done；不直接 merge legacy ownership |
| P8 release infrastructure | migration `20260817015215`、backup／restore rehearsal、Supabase Cron、rollback compatibility | Done |
| P9 handoff | CI run `31987861315`、staging commit `69132b9`、README runbook | Done |

## 11. Readiness verdict

### Verdict：Ready for N1

- **Healthy enough now：** 隔離 staging、核心 journeys、migration、backup／restore、schedule、CI、deploy 與 rollback compatibility 已就位。
- **真正缺口：** settings 沒有 canonical schema；identity bindings 仍是 compatibility placeholder；企業差異尚未形成 deployment profile；provider／cron observability 尚未完整。
- **第一步：** N1 設定真相與企業變化矩陣。它只整理已存在的 keys／consumers／defaults，不改 UI、DB 或 side effect。
- **重新評估點：** N1 若發現同一 key 在不同 consumer 具有衝突語意，先修 target design 與 N2／N3，不建立模糊共用 schema。

## 12. 文件政策

- 本文件是唯一 active productization plan／TODO／readiness record。
- README 只保留安裝、驗證、release、backup、schedule 與 rollback 操作。
- `AGENTS.md`／`CLAUDE.md` 只保留工具指示；`marketing/mascot-design-system.md` 只負責角色視覺規格。
- 完成歷史由 Git、tests、CI run、runtime receipt 與 CodeGraph 保存；不另建 diary、checkpoint 或 archive pointer 文件。
