# KV 產品化控制計畫

> 這是唯一現行計畫、TODO、架構決策入口與 readiness 判定。Git、測試、CI、runtime 與 CodeGraph 保存歷史證據；本文件只保留會改變下一步的內容。

## 1. 計畫身分

| 欄位 | 內容 |
|---|---|
| Lifecycle | Active |
| Profile／release intent | Standard／production slice |
| Owner | CabLate engineering；產品範圍由 CabLate product owner 決定 |
| Repository／branch | `F:\ownproject\kv`／`codex/kv-wp0-toolchain` |
| Planning base | `33e8eed`（P0-P9／Loopwise contract 收尾基準） |
| Last verified | 2026-08-18；source、CodeGraph、設定 consumer map、P0～P9 handoff evidence |
| Readiness | Ready for N2；N1 source-level truth 已完成，仍須由 N2 驗證實際資料列與 typed boundary |

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
  -> modules/agents/admin（只判斷 truthy object；沒有 slug schema）
  -> Supabase agent repository（只確認可序列化 JSON）
  -> line_agents.settings

Runtime consumers
  -> Visit adapter 讀 availability／identity／approval keys 並套預設值
  -> Orders / Support / Team Lead 讀各自 workflow 的 reportTo／pushStyle
  -> 其他頁面目前只把 UI 設定保存回 JSON，沒有 server runtime consumer
  -> domain use case
  -> provider / repository adapter
```

| Fact | Stable anchor | 對下一步的影響 |
|---|---|---|
| `line_agents.settings` 是目前 deployment setting truth，資料庫型別為 `jsonb`／`Json`、預設 `{}`；目前 write boundary 只保證可序列化 JSON，admin parser 會接受 truthy object（陣列也會通過） | `modules/agents/admin.ts`、`supabase-agent-admin-repository.ts`、`database.types.ts` | 先保留 storage；在 read／write boundary 加 schema，不先改 DB |
| Agent pages 以 `Record<string, unknown>` 傳設定，各頁自行載入與判斷欄位；儲存時只送該頁目前 state 加上 `pushStyle`，未被該頁載入的未知 key 可能在下一次儲存時消失 | `AgentPageShell.tsx`、`app/(dashboard)/agents/*/page.tsx` | N1 已完成 source matrix；N2 必須決定 unknown-key policy |
| Visit 已有獨立 `VisitSettingsPort`，但 adapter 仍手動轉型與預設 | `modules/visit/settings-ports.ts`、`adapters/visit/supabase-visit-settings.ts` | 可作第一個 typed-config slice；不再包一層 forwarding interface |
| Orders、Support、Team Lead 直接把 settings cast 成 record 後讀 `reportTo`／`pushStyle` | `modules/orders/orders.ts`、`modules/support/report.ts`、`modules/reporting/team-lead.ts` | 共享 field 名稱不代表共享 workflow；schema 依 domain 持有，可重用窄 field schema |
| role／instance／binding 模型已存在，但目前 deployment 固定為 `legacy-static-registry`，bindings／capabilities 為空 | `modules/agents/identity.ts` | 這是 compatibility seam，不得宣稱已可動態編排；N3 才加入真實 bindings |
| domain modules／provider adapters 主幹已就位；`src/lib` 與 KB forwarding facade 仍有過渡 ownership | `src/modules`、`src/adapters`、`src/lib/kb-*` | 只在 N2／N3 或新需求碰到時 touch-and-migrate |
| Main DB、provider credentials 與 app runtime 都是 deployment-global | `lib/supabase.ts`、provider env readers、`.env.example` | 先採每客戶隔離部署；只加 `tenant_id` 不會變成 SaaS |
| P0～P9 已完成 staging、migration、backup／restore、Supabase Cron、CI、Chrome 與 rollback compatibility | README release runbook、CI run `31987861315`、commit `69132b9`；Loopwise contract alignment 在 `33e8eed` | 下一階段不重做基礎建設；Teachify staging signed／malformed smoke 已驗證 200／400 且無 DB／LINE side effect，仍待真實 provider event |

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

### N1：建立設定真相與企業變化矩陣 `[done]`

**Contribution：** G-01、G-02、G-03。

**Scope anchors：** `line_agents.settings`、所有 Agent settings pages、Visit／Orders／Support／Reporting consumers、現有 unit／browser contracts。

#### N1 source truth：先分清楚「真的會影響 runtime」與「目前只是 UI 可保存」

這份矩陣是依目前 source 的實際讀寫整理，不是依欄位名稱猜共用語意。

- `P` 是設定頁首次載入時的 page default；`R` 是 server runtime 缺值／錯值時的 fallback。
- `runtime read` 只列真正讀取 `line_agents.settings` 的 server consumer。只在 page 中保存、預覽或回載的欄位標成 `UI-only`，不能宣稱已經能驅動產品流程。
- `Class` 只使用五類：`config`（deployment-safe config）、`provider`（provider connection/reference）、`secret`、`presentation`、`policy`（domain policy）。目前沒有發現任何應放進 `line_agents.settings` 的 secret。
- `identifier` 代表 LINE User ID 或顯示名稱等敏感度較高的資料，但不是 credential；`secret` 只放 deployment secret store／環境變數。

#### Visit（`slug=visit`）

| Key | Type／default | Allowed values／current normalization | Write owner／UI | Runtime read／target schema owner | Current failure behavior | Class／sensitivity |
|---|---|---|---|---|---|---|
| `inputSources` | `string[]`; P=`名片圖片`, `轉寄 Email` | UI 目前只提供這兩個 label；page 只做 array cast | Visit page → `AgentPageShell` PATCH | 無 server consumer；若日後啟用，應由 Visit trigger contract 持有 | 非 array 不回載，保留 page default；現在不影響 webhook | config（目前 UI-only）／public |
| `calendarSource` | `string`; P=`google` | `google`／`outlook`／`none` | Visit page | 無 server consumer；實際 Calendar provider 目前由 provider adapter／環境設定決定 | 任意字串可被保存與回載，但不改實際 provider | provider（目前 UI-only）／public |
| `rangeStartDays` | page 是 `string` P=`"3"`; runtime canonical `number` R=`3` | UI `min=0`；adapter 使用 `Number(value) || 3`，沒有上下限或整數驗證 | Visit page；runtime default owner 是 `supabase-visit-settings` | `createSupabaseVisitSettings` → Visit offer → Google free-slot lookup | 非數字、空字串、`0` → 3；負數會通過；DB read error 直接拋錯 | policy／public |
| `rangeEndDays` | page `string` P=`"7"`; runtime `number` R=`7` | UI `min=1`；adapter 同樣只做 `Number(...) || 7`，沒有與 start 的關係驗證 | Visit page；`supabase-visit-settings` | Visit offer → provider `findFreeSlots` | 非數字、空字串、`0` → 7；負數或 start > end 未在 settings boundary 阻擋 | policy／public |
| `slotCount` | `string`; P=`"2"` | UI `1..5`；Visit offer 目前把 provider input 寫死為 `slotCount: 2` | Visit page | 無；目前不會被 runtime 讀取 | 可保存與回載，但改值沒有產品效果 | presentation（unwired）／public |
| `meetingDuration` | page `string` P=`"60"`; runtime `number` R=`60` | UI `min=15, step=15`；adapter 沒有真正 range validation | Visit page；`supabase-visit-settings` | Visit offer → Calendar free-slot lookup | 非數字、空字串、`0` → 60；負數可能通過 provider input | policy／public |
| `meetingType` | `string`; P/R=`喝咖啡` | 非空字串；沒有 enum | Visit page；`supabase-visit-settings` | Visit offer／approval → AI draft、Calendar description | 空字串或非 string → 喝咖啡；其他文字原樣進 prompt／Calendar description | policy／public |
| `workingHoursStart` | `string`; P/R=`09:00` | UI `time` 欄位預期 `HH:mm`；server 不驗格式 | Visit page；`supabase-visit-settings` | Visit offer → Google free-slot lookup | 非 string → 09:00；格式錯誤的 string 會繼續流到 provider，可能造成無時段或 provider error | policy／public |
| `workingHoursEnd` | `string`; P/R=`18:00` | UI `time` 欄位預期 `HH:mm`；server 不驗格式 | Visit page；`supabase-visit-settings` | Visit offer → Google free-slot lookup | 非 string → 18:00；格式錯誤或 end 小於 start 未在 settings boundary 阻擋 | policy／public |
| `requireApproval` | `boolean`; P/R=`true` | `true`／`false` | Visit page；`supabase-visit-settings` | Visit offer → pending invite／是否先走 LINE approval branch | 非 boolean → true；會改變寄信前的人工作業分支 | policy／public |
| `senderName` | `string`; P/R=`樊松蒲 Dennis` | 非空字串才被 adapter 接受 | Visit page；`supabase-visit-settings` | Visit offer／approval／respond → email、Calendar、活動摘要；outputs page 也讀取 | 空字串或非 string →預設名稱；其他文字會進外部訊息與 Calendar | config（sender identity）／display identifier |
| `emailSubject` | `string`; P=`{{myName}} 想與您約時間{{meetingType}} ☕` | 自由文字；page 只做 placeholder preview | Visit page | 無 server consumer；實際 draft 由 AI provider 生成 subject | 可保存／回載，但目前不改實寄 email | presentation（unwired）／public |
| `emailBody` | `string`; P=`{{contactName}} 您好，\n\n很高興認識您！不知道您接下來方便的話，是否能約個時間{{meetingType}}聊聊？` | 自由文字；page 只做 placeholder preview | Visit page | 無 server consumer；實際 draft 由 AI provider 生成 body | 可保存／回載，但目前不改實寄 email | presentation（unwired）／public |
| `lineConfirmTemplate` | `string`; P=`已為您寄出邀約信給 {{contactName}}，提議 {{slot1}} 或 {{slot2}} 見面，等候對方回覆。` | 自由文字；page 只做 placeholder preview | Visit page | 無 server consumer；LINE confirmation 目前由 workflow／route contract 產生 | 可保存／回載，但目前不改實際 LINE 回覆 | presentation（unwired）／public |

#### Orders、Support、Team Lead：同名 `reportTo` 不代表同一個設定語意

| Workflow／key | Type／default | Allowed values／current normalization | Write owner／UI | Runtime read／failure | Target／class／sensitivity |
|---|---|---|---|---|---|
| Orders `reportTo` | `string`; P=`""`; R=`trim()` 後需非空 | UI 提示 U 開頭，但沒有格式驗證 | Orders page + shared `AgentPageShell` | `orders.ts`；空白／缺值 → `missing_recipient`，不送 LINE | Orders settings schema；config／LINE identifier |
| Support `autoReplyText` | `string`; P=`已收到您的訊息...` | 自由文字 | Support page | KV relay 不回覆，無 server consumer；目前改值不影響下游助理 | 若未來 KV 接管回覆才進 Support schema，否則應 retire；presentation／public |
| Support `reportTo` | `string`; P=`""`; R=`trim()` 後需非空 | UI 提示 U 開頭，沒有格式驗證 | Support page + shared shell | `support/report.ts`；空白／缺值 → `missing_recipient`，不送每日彙報 | Support report schema（不可與 Orders 共用語意）；config／LINE identifier |
| Support `reportTime` | `string`; P=`09:00` | UI `time`；沒有 server validation | Support page | 無；實際排程由 Supabase Cron／既有 schedule 設定控制 | Cron schedule owner；目前不應放在 Agent workflow schema；policy（UI-only）／public |
| Team Lead `reportTo` | `string`; P=`""`; R=`trim()` 後需非空 | UI 提示 U 開頭，沒有格式驗證 | Team Lead page + shared shell | `modules/reporting/team-lead.ts`；空白／缺值 → `missing_recipient`，不送晨報 | Team Lead report schema（不可與 Orders／Support 共用語意）；config／LINE identifier |
| Team Lead `reportTime` | `string`; P=`09:00` | UI `time`；沒有 server validation | Team Lead page | 無；實際排程由 Supabase Cron／既有 schedule 設定控制 | Cron schedule owner；目前 UI-only；policy／public |

#### `pushStyle`：shared presentation key，不是 shared workflow policy

`AgentPageShell` 對全部 12 個 Agent page（`teamlead`、`notify`、`report`、`schedule`、`card`、`expense`、`visit`、`today`、`competitor`、`operations`、`support`、`orders`）都會寫入 `pushStyle`。

| Key | Type／default | Allowed | Write／read owner | Current runtime behavior | Target／class／sensitivity |
|---|---|---|---|---|---|
| `pushStyle` | `string`; page shell P=`text`；Orders／Support／Team Lead runtime R=`flex` | `text`／`flex`／`confirm`／`buttons` | shared `AgentPageShell`；server rules 各自持有窄型別 | shell 用於預覽／test push；只有 Orders、Support report、Team Lead report 讀 DB 設定；其他 Agent 沒有 durable runtime consumer | 可共用窄 presentation value schema，不共用 workflow schema；presentation／public |

#### 其他可保存設定頁：目前都是 UI projection，不能當成已完成的 workflow 配置

| Agent／keys | Type／default | Allowed／write owner | Runtime read／failure | Target／class／sensitivity |
|---|---|---|---|---|
| Schedule `calendarSource` | `string`; P=`google` | `google`／`outlook`／`none`；Schedule page + shared shell | 無 server consumer；修改不改 Calendar provider | 若日後有真正排程 consumer，再由 Schedule workflow schema 持有；provider（目前 UI-only）／public |
| Schedule `slots` | `string`; P=`週一至週五 10:00–18:00，每次諮詢 30 分鐘` | 自由文字；Schedule page | 無 server consumer；只改預覽 | presentation（unwired）／public |
| Schedule `reminderMinutes` | `string`; P=`30` | UI number；無 server validation | 無 server consumer；只改預覽文字 | policy（目前 UI-only）／public |
| Schedule `allowReschedule` | `boolean`; P=`true` | `true`／`false`；Schedule page | 無 server consumer；不會改 LINE flow | policy（unwired）／public |
| Schedule `template` | `string`; P=page literal（含 `{{minutes}}`） | 自由文字；Schedule page | 無 server consumer；只改預覽 | presentation（unwired）／public |
| Operations `lines` | `ProductLine[]`; P=page 的 5 筆產品線 seed | 每筆 `{name, status, owner, nextStep}`；status=`進行中`／`規劃中`／`暫停`／`已完成`；Operations page | 無 server consumer；上方 pipeline panel 讀 Teaching system，不讀這個 key | Operations presentation projection；presentation／可能含人名但非 credential |
| Notify `triggerType` | `string`; P=`threshold` | `threshold`／`event`／`scheduled`；Notify page | 無 server consumer；不會真的建立 trigger | 未來 Notify workflow schema 或 retire；policy（unwired）／public |
| Notify `metric` | `string`; P=`問卷完成率` | 自由文字；Notify page | 無 server consumer；只改預覽 | policy（unwired）／public |
| Notify `operator` | `string`; P=`<` | `<`／`>`／`=`；Notify page | 無 server consumer；只改預覽 | policy（unwired）／public |
| Notify `value` | `string`; P=`65` | UI 文字欄，沒有數字驗證；Notify page | 無 server consumer；只改預覽 | policy（unwired）／public |
| Notify `target` | `string`; P=`行銷群組` | `行銷群組`／`全體管理員`／`承辦人個人`；Notify page | 無 server consumer；只改預覽 | config／目前 UI-only／public |
| Notify `template` | `string`; P=page literal（含 `{{metric}}`、`{{value}}`） | 自由文字；Notify page | 無 server consumer；只改預覽 | presentation（unwired）／public |
| Notify `quietStart` | `string`; P=`22:00` | UI `time`；無 server validation | 無 server consumer；不會真的靜音排程 | policy（unwired）／public |
| Notify `quietEnd` | `string`; P=`08:00` | UI `time`；無 server validation | 無 server consumer；不會真的靜音排程 | policy（unwired）／public |
| Marketing `dataSource`（`report`／`card`／`expense`／`today`／`competitor`） | `string`; P=`""` | 自由文字；共用 `MarketingAgentShell` | 無 server consumer；提示中的 GA4／GSC／Meta 等串接仍由 integration status／專用 API 決定 | 各 integration 的 config owner；provider（目前 UI-only）／可能含帳號識別碼 |
| Marketing `template`（`report`／`card`／`expense`／`today`／`competitor`） | `string`; P=各頁 `previewText` literal | 自由文字；共用 MarketingAgentShell | 無 server consumer；只改預覽／test push | 各 Agent presentation projection；presentation／public |

#### Write boundary、unknown keys 與實際 schema owner

目前沒有一個真正的共用 `AgentSettings` schema：

1. `line_agents.settings` 在 DB 是 `jsonb not null default '{}'`，TypeScript 只生成寬鬆 `Json`。
2. `enabled` 是 `line_agents` 的獨立 deployment state，不是 settings key；`PATCH /api/agents/[slug]` 另外處理它。
3. 同一個 PATCH 只要 `settings` 是 truthy object 就會被接受，陣列也會通過，沒有依 slug 驗證 key。
4. Supabase adapter 只檢查可序列化 JSON，沒有欄位、型別、unknown-key 或 secret policy。
5. `AgentPageShell` 儲存的是頁面目前 state 加 `pushStyle`；頁面沒有載入的舊 key 不會自動 merge，因此目前 unknown-key policy 實際上是「可能在下次 page save 被丟掉」。
6. N2 應由每個真正的 workflow owner 持有 schema；只有 `pushStyle` 這種已證明的窄 presentation value 可以共享。`reportTo`、`reportTime`、`template` 等同名欄位不得因名稱相同就共用一個 workflow schema。

#### Enterprise variation matrix

| 企業差異 | 現在可否用設定表達 | N1 判定 | N2／N3 target owner | 不應怎麼做 |
|---|---|---|---|---|
| Visit 可預約天數、時段、會面時長 | 部分可以；runtime 只讀 Visit 的 8 個欄位 | 可作 typed config，需補範圍與 cross-field validation | Visit settings schema／Visit workflow | 不把 UI-only `slotCount` 當成已生效功能 |
| 是否需要人工核准 | 可以；`requireApproval` 真的改變 workflow branch | domain policy | Visit workflow | 不放進 presentation catalog |
| 寄件人名稱 | 可以；會進 email／Calendar／活動摘要 | deployment-safe sender identity | Visit settings schema | 不當 secret，也不與 Agent role name 混用 |
| 訂單／客服／晨報通知對象 | 可以；各 workflow 各自讀 `reportTo` | 可作 routing config，但語意分開 | Orders／Support／Team Lead 各自 schema | 不建立一個跨 workflow `reportTo` abstraction |
| LINE 訊息外觀 | 可以；`pushStyle` 有共用四值 | 可共享窄 presentation schema | shared presentation value + workflow delivery rule | 不把 message style 當成 workflow engine |
| 每日執行時間 | 頁面有 `reportTime`，但目前不生效 | 目前不能宣稱可配置 | Cron schedule owner；日後另有需求再接 workflow | 不把 UI 欄位當成排程已完成 |
| Calendar／GA4／GSC／Meta／Teachify 連線 | 部分頁面有選擇或識別碼欄位，但實際連線不是由這些 JSON key 驅動 | provider connection 必須分開 | deployment profile／provider adapter | 不把 API key、refresh token、webhook secret 放進 JSON |
| 新增企業流程或新的 Agent | 目前不能由 settings JSON 表達 | 需要 N3 code-owned versioned binding | workflow definition + domain owner | 不先建 JSON DSL、通用 runner 或複製 customer fork |

**N1 結論：** source-level settings truth 已完成。這證明 N2 可以開始設計 typed boundary；它不宣稱目前所有 UI 欄位已接上 runtime，也不宣稱 live DB 每一列都已通過新 schema。live row parse、invalid／unknown tests 與 Chrome save/reload 是 N2 的驗證責任。

**步驟：**

1. 逐 workflow 記錄 key、型別、預設值、允許範圍、read owner、write owner、runtime consumer 與敏感性；不把 `reportTo` 等相同名稱直接推成共同 workflow。
2. 把欄位分成 deployment-safe config、provider connection、secret、presentation-only 與不該可設定的 domain policy。
3. 用目前已存在的變化作 acceptance examples，例如 Visit `requireApproval`、時間範圍、通知對象與推播樣式；新增企業需求只能補進矩陣，不直接複製程式。
4. 為每組設定決定 schema owner、default owner、unknown-key policy、invalid-value policy 與版本策略。

**不改：** UI、DB schema、runtime side effect、provider credentials。

**驗證／Done When：** 每個被 runtime 使用的 key 都能指到一個 owner、consumer、default 與 failure behavior；每個 settings page 的 UI-only key 也有明確標記；沒有 secret 被歸進 Agent settings；N2 不需再猜 schema。N1 的完成證據是本矩陣與 source anchors，不包含 live row parse 或 provider acceptance。

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
| Teachify provider truth | 官方 Loopwise header／payload contract 已確認並接入；secret 已設定於 `kv-staging`；staging signed／malformed smoke 已分別得到 200／400，且沒有 DB／LINE side effect；仍待真實 `payment.paid`／`payment.refund` event | Teachify 真實 provider 驗收與對客啟用 | N1～N6 其餘工作 |
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
| N1 settings truth | `docs/PRODUCTIZATION_PLAN.md` 的 source-level settings matrix、CodeGraph snapshot、current page／runtime consumer anchors | Done；live row parse、typed validation 與 real provider acceptance 留在 N2／provider gates |

## 11. Readiness verdict

### Verdict：Ready for N2

- **Healthy enough now：** 隔離 staging、核心 journeys、migration、backup／restore、schedule、CI、deploy 與 rollback compatibility 已就位。
- **真正缺口：** settings 尚未有 workflow-owned canonical schema；identity bindings 仍是 compatibility placeholder；企業差異尚未形成 deployment profile；provider／cron observability 尚未完整。
- **N1 已完成：** 已逐一標出 runtime-used keys、UI-only keys、defaults、讀寫 owner、failure behavior、schema target、分類與敏感度；也確認 `reportTo` 等同名欄位不能直接共用。
- **下一步：** N2 先把 Visit 的 runtime-used settings 轉成 typed boundary，再依 evidence 處理 Orders、Support／Team Lead；不要先替 UI-only 欄位建立假的 runtime schema。
- **重新評估點：** N2 若讀到 live row 含未列出的 key，先決定保留／棄用／移除條件，不要讓 AgentPageShell 在無意間刪除未知設定。

## 12. 文件政策

- 本文件是唯一 active productization plan／TODO／readiness record。
- README 只保留安裝、驗證、release、backup、schedule 與 rollback 操作。
- `AGENTS.md`／`CLAUDE.md` 只保留工具指示；`marketing/mascot-design-system.md` 只負責角色視覺規格。
- 完成歷史由 Git、tests、CI run、runtime receipt 與 CodeGraph 保存；不另建 diary、checkpoint 或 archive pointer 文件。
