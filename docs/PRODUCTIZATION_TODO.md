# KV 產品化控制清單

> 這是唯一的產品化 TODO、現況索引與 readiness 判定。Git 保存歷史，不另建 TODO v2、重構日誌或重複 architecture 文件。

## 1. 目標、邊界與完成條件

目標：在原 repository 內漸進整理 KV，使工程團隊能理解、驗證、修改、部署與擴充；既有 UI／UX、API、資料格式與外部 side effects 除非另有產品需求，全部保持不變。

狀態：`Active`｜Repo：`F:/ownproject/kv`｜Branch：`codex/kv-wp0-toolchain`｜環境：Main `kv-staging` + 獨立唯讀 Teaching DB｜判定：`Architecture ready for scoped delivery; needs product and external acceptance truth`

### 換機接續 checkpoint（2026-08-06）

- Git snapshot：`codex/kv-wp0-toolchain`／`725ef59` 起，收尾 commit 見 branch tip；checkpoint 前工作樹乾淨。CodeGraph 為 442 files／3,754 nodes／7,730 edges，無 pending drift。
- Remote：`origin` 仍是已無法解析的 `cablate/kv`；可用的作者 repo 已登記為 `upstream = https://github.com/fanstudents/kv.git`。作者 `main` 截至 `d958a0b`，相對共同基底有 13 個 commits，尚未合併。
- 新電腦先讀：本文件 → `AGENTS.md`／`CLAUDE.md` → `README.md` → `.env.example`；不要重做全 repo 掃描或再建平行 TODO。
- 恢復順序：clone `fanstudents/kv` → switch `codex/kv-wp0-toolchain` → `npm ci` → 以安全管道重建 `.env.local` → `npm run verify`。`.env.local` 被 Git 忽略，必須另用 password manager／secret store 轉移，絕對不要 commit。

### 產品方向更新（2026-08-13）

已確認事實：

- Dennis 預計 9 月底開始推廣；近期交付型態是企業導入或企業內訓，不先以通用 self-service SaaS 為主要目標。
- 合作方的角色是提供企業資源與銷售能力；KV 可能與互動簡報系統共同銷售，合作分潤仍待正式協議。
- 首波場景偏向工廠、製造、半導體；資訊業則以辦公室資安為較明確切入點。
- Dennis 認同外部能力應模組化；目前工程目標是把既有糾纏逐步收進明確 domain／adapter boundary，而不是一次建成通用外掛平台。

尚未決定：首個可驗收產業方案、KV 與簡報系統是綁售或選配、簽約／收款／分潤、售前／導入／內訓／維運責任、資料／prompt／教材／程式碼權利，以及所需產業人士是引薦、售前顧問、領域顧問或講師。

因此近期架構目標是「可依企業專案組裝的能力模組 + 可替換 provider adapter + 每案可驗收的 solution profile」，不是動態 Agent 市集、任意 workflow engine 或未知需求的多租戶 secrets 平台。

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
enterprise solution profile
(manufacturing / semiconductor / office security / ...)
                  |
                  v
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
- **不是所有模組都同樣成熟**：OpenAI shared transport、Orders、Support 已有清楚 owner；Visit 已模組化但仍保留少量有界的 legacy translation；Firecrawl 尚把 provider transport、crawl policy、Supabase persistence 與 KB ingestion 混在 `src/lib/kb-crawl.ts`；Teachify 的真實簽章契約仍未由 sandbox event 證實；GA4／GSC／Google 已有 provider boundary，但部分 demo projection 與 Visit legacy delivery 仍待真實旅程觸碰時收斂。
- **下一階段是垂直切片，不是水平重構**：先選企業情境與 journey，再只整理該 journey 經過的 capability module、provider adapter、recovery 與驗收證據。沒有第二個真實 consumer 或共同故障模式，不抽通用框架。

```text
solution profile (客戶／產業情境與驗收)
  -> capability modules (KB / Visit / Orders / Reporting / Meeting / Support)
    -> provider adapters (OpenAI / Firecrawl / Google / LINE / Teachify / Supabase)
```

| Boundary | 現況 | 後續原則 |
|---|---|---|
| OpenAI | shared client + domain adapters，邊界清楚 | 拿 key 後做成本受控 acceptance，不再抽象一層 |
| Orders／Teachify | Orders workflow／repository／LINE delivery 已分離；真實 webhook 契約未證實 | sandbox event 驗簽章、重送、out-of-order，再決定 recovery |
| Visit／LINE／Google | use cases、ports、lock 已建立；少量 `legacy-*` compatibility seam 仍在 | 只隨真實 delivery journey touch-and-migrate |
| Knowledge Base／Firecrawl | domain owner 已有；`kb-crawl.ts` 仍混 transport、policy、persistence、ingestion | 真實 crawl 時拆成 Firecrawl adapter + KB application，不建 generic crawler platform |
| Reporting／GA4／GSC | provider query boundary 已有；部分 demo／fallback 尚未被真實資料取代 | 先用授權的 read-only property/site 驗輸入、空資料與 quota |
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
| Overdesign cleanup | `b16512f` | KB adapters 三檔合一、forwarding tests 三檔合一、移除單 caller 轉送與 source-string tests；淨少 111 行 |
| KB provider-disabled UI | `f0dff54` + Chrome evidence | 缺 Firecrawl key 時頁面可理解失敗並恢復操作；UI 未改 |
| Current no-key verification | `npm run verify`、Playwright、online staging、CodeGraph、Chrome | 127 files／612 tests、93-page build、132 browser tests；Orders 1 + lock 2 staging tests、fixture cleanup 0；Knowledge Base／Visit／Meeting 實機無 app error；2026-08-13 graph sync 445 files／3,763 nodes／7,428 edges、pending changes 0 |

## 5. Active TODO

### WP-08 Enterprise delivery definition `[?]`

- [ ] 從製造／工廠／半導體／辦公室資安選定第一個 solution profile，寫出使用者、輸入資料、核心 journey、成功條件與明確不做項；它是功能驗收切片，不是另一套 framework。
- [ ] 與 Dennis／合作方確認 KV 與互動簡報系統的 bundle 方式，以及簽約、收款、分潤、銷售、售前、導入、內訓、客服、維運的 owner。
- [ ] 確認資料、prompt、教材、程式碼與客戶設定的權利／交接；確認需要的產業人士角色、數量、資歷、地區與合作方式。
- [?] 判定部署模型：近期預設「每客戶／環境獨立 secrets 與設定」；只有確定單一 deployment 同時服務多企業，才規劃 tenant-aware credential store／isolation。

### WP-09 Upstream intake `[?]`

作者新增內容已讀到 `fanstudents/kv@d958a0b`：78 個變更檔、13 個 commits；與本 branch 有 29 個重疊檔，整包 merge 模擬會有 23 個衝突檔／45 個衝突區塊，因此不做 merge 或整顆 cherry-pick。

- [ ] 優先手工移植 `add_run_cost` 原子累加；現有 `logStep` 仍是 read-modify-write，而 Main migration 已有 RPC。
- [ ] 將名片轉正、LINE 寄出／取消卡片、Firecrawl fallback、社群連結、劇院圖文／hold state 視為 Visit 功能需求，逐個移入現有 `modules/visit`／adapters並各自驗收；不復活舊 `src/lib/contact-research.ts` 或巨大 webhook。
- [?] 品牌改名與 Super Agent 展示頁是產品／UI 變更，需產品確認後才做。
- [x] 明確拒絕直接帶入：錯誤的 `gpt-realtime-2.1` 計價、尚未證明安全的 generic retry／Agent task runtime、414 行預設 Supabase config、後端硬等 4 秒與 DB base64 大圖做法。

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

本地 CI、scheduled workflows、Playwright diagnostics 已存在；作者 repo 已確認為 `upstream/fanstudents/kv`，但 `origin` 已失效、canonical remote／branch policy 尚未定案。scheduled URLs 指向 `https://kva.zeabur.app`，部署真相仍未知。

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

總量：需向外部服務取得 12 個 credential values；另有 5 個必要設定值與 1 個選配 Calendar IDs。Main Supabase credentials 已設定，不列入待取得數量。

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

目前外部取得策略：Dennis 可提供 OpenAI、Firecrawl、Teachify，GA／Google 資源需確認授權範圍；上述全部仍視為「尚未收到／尚未驗證」。OpenAI／Firecrawl 可用合成資料與成本上限驗收；Teachify 先要 sandbox 或去識別事件，不直接改正式 webhook；GA4／GSC 優先唯讀。LINE 已承載正式業務，除非另建測試 channel／recipient allowlist，不使用 Dennis 的 production token 做重構驗收。

## 7. 執行順序

1. 先完成 WP-08 的第一個 solution profile 與合作責任邊界；這會決定哪些 journey 必須在 9 月底前達標。
2. 拿 OpenAI key，跑最窄的付費 acceptance。
3. Firecrawl + OpenAI 完成 KB 單頁 journey與 cleanup；同批收斂 `kb-crawl.ts` 的已證實邊界。
4. Google read-only；再用 allowlisted email 做 Calendar／Gmail write。
5. Teachify sandbox event；先確認 replay 產品決策。LINE primary／support 只在測試 channel／recipient allowlist 準備好後分開驗，再接 Visit、Orders、Reporting、Support composite journeys。
6. 只依真實故障做 WP-20；接著恢復 remote、驗 CI／deploy／rollback。
7. WP-22 final cleanup、矩陣驗收與交接。

每個 slice 都要：CodeGraph 找 owner／consumer → 固定不變契約 → 完成同批程式碼 → focused tests → affected Chrome journey → heavy verify → 精確 cleanup → coherent commit。本來沒有 UI 的 API 才能以 API evidence 取代 Chrome；低等級 mock 不得冒充 provider／staging 完成。

## 8. Readiness verdict

- Healthy enough：整體骨架、Main／Teaching DB、核心 domain ownership、本地驗證、Orders staging、atomic conversation lock、provider-disabled behavior 都已就位；可直接承接第一個企業 solution profile，不需先完成全面重構。
- Not uniformly clean：Firecrawl／KB 是目前最明顯的責任混合點；Visit 有受控 legacy seam；Teachify、GA4／GSC／Google／LINE 的完成度取決於真實 provider evidence，不能因 tests 綠燈宣稱完成。
- Actually blocked：第一個企業驗收情境與合作責任尚未定案、外部 provider credentials／safe recipients、三個產品 recovery 決策、canonical GitHub／Zeabur deploy與 rollback truth。
- Safe work now：可做 WP-09 原子成本累加、沿已選 solution profile 承接需求；其餘 upstream 內容按需求手工移植。避免再做全域搬檔、每 route 一套 layer 或預建通用 Agent／plugin／multi-tenant framework。
- 下一步：先收斂 WP-08，再照第 6 節取得安全 credentials／資產，依第 7 節做真實 acceptance；不要一次開所有 side effects。

## 9. 文件政策

- 只保留本文件的 current truth、active TODO、blocker、key matrix與 readiness；完成細節壓成 outcome ledger。
- CodeGraph、source、tests、Git、staging query與 Chrome 保存執行證據；本文件不複製流水帳。
- 每次 meaningful drift 更新狀態並刪除過期敘述，不讓 TODO 再膨脹成歷史報告。
