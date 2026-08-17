# KV 產品化接續執行計畫（Luna 主文件）

> 這是 2026-08-16 起的唯一執行主計畫。Luna 應以本文件決定後續順序、完成條件與停止點。
> `docs/PRODUCTIZATION_TODO.md` 只保留過去盤點、測試數據與 commit 證據，不再決定後續行為。
> 目前 source code 與 runtime evidence 優先於舊文件；若發現 drift，先修本文件再繼續下游工作。

## 1. 計畫身分與判定

| 欄位 | 內容 |
|---|---|
| Lifecycle | Active |
| Profile | Standard productization handoff |
| Repository | `F:\ownproject\kv` |
| Branch | `codex/kv-wp0-toolchain` |
| Base commit | `905f2ab`（P0～P2 完成，P3 deployment prep 完成） |
| Last verified | 2026-08-17；P3 hosted Support、P4 驗收矩陣、P5 證據驅動修正、P6 集中重驗／cleanup、P7A U2、真實 Primary LINE Visit happy path 與 terminal step ledger 修復均完成 |
| Release intent | 九月底 production slice：現有功能全部納入，不新增平台功能 |
| Current package | P7 Teachify closure／waiver；P8 canonical release、backup／restore 與 rollback ownership |
| Readiness | P0～P6 已完成；Support hosted evidence、真實 marker reply 與 cleanup 均完成；Primary LINE Visit 已完成 image、決策卡、兩段 postback、Gmail、Calendar、LINE 通知、背景研究、Chrome TV happy path、hosted timeout 單次處理與重跑防重複，以及 LINE retry-key recovery contract。Visit 只剩既有 happy-path fixture／Calendar cleanup；另有 Meeting 真實媒體 journey、P7 Teachify truth／waiver，以及 P8 canonical repo／deploy、backup／restore、schedule／rollback owner，仍不可直接把產品化 branch 當正式版 |

開始任何工作前先執行：

1. 確認 branch、HEAD、dirty worktree。
2. 比較 HEAD 與本文件 base commit 是否碰到 Support webhook、relay、環境設定、測試或部署路徑。
3. 執行 `codegraph status "F:\ownproject\kv" --json`；若 index 有 drift，先用 source／`rg` 查證，不自行重建 index。
4. 若新改動改變產品行為、依賴順序或外部服務責任，先修正本文件與所有下游工作包。

## 2. 最終成果與不可破壞的邊界

### 成果

工程團隊可以在隔離環境部署 KV，重跑現有功能，辨認真實資料與錯誤，完成外部服務驗收，並能備份、回退和交接下一次修改。

### GORE goal chain

| Goal | 可觀察成果 | 對應工作包與證據 |
|---|---|---|
| G-01：九月底交付現有 KV 功能 | 現有功能矩陣在 staging 留下 API、DB、provider、Chrome 與 cleanup 證據 | P2～P7 |
| G-02：Support 維持現有 relay 整合 | LINE 事件由 KV capture 後 relay，模擬下游可接收並回覆 | P0～P3 |
| G-03：修改成本可控制 | 問題由單一 domain owner 修正，不增加無 consumer 的共用 runtime 或四層樣板 | P5～P6 |
| G-04：另一位工程師可以發布與回復 | exact commit、migration、backup、排程與 rollback 有可重跑證據 | P8～P9 |

### 必須保留

- UI／UX 與現有頁面外觀。
- 既有 API URL、主要 JSON 契約與 Main／Teaching 資料 ownership。
- Support webhook 的 LINE signature 驗證、capture、relay 與有效事件 `200 ACK` 語意。
- Support LINE 與 Primary LINE 使用不同 channel credentials。
- 各 domain 明確持有自己的 workflow；安全參數可設定，行為不改成任意 JSON DSL。
- 每個階段一個 coherent commit；不得提交 secret、測試收件人或 LINE user ID。

### 不在本輪範圍

- 重做 UI。
- 移除 Support relay。
- 依賴 Dennis 的個人助理系統。
- 通用 workflow engine、plugin marketplace、microservices 或 universal retry。
- 多租戶 SaaS、tenant schema、billing 或 RBAC 重建。
- 為減少檔案數而機械搬檔。

## 3. 已確認的現況與最新產品決策

| 類型 | 內容 | 執行影響 |
|---|---|---|
| Fact | 現行 `src/app/api/line/webhook/support/route.ts` 會驗證簽章、capture 訊息並呼叫 relay | relay 是目前 runtime path，不得刪除 |
| Fact | `src/modules/support/relay.ts` 擁有 delivery key、isolated failure 與 capture 規則 | 保留 domain owner；只依真實驗收補強 |
| Fact | `src/adapters/support/support-relay-dependencies.ts` 讀取 `SUPPORT_RELAY_TARGET_URL` 並轉送 raw body／signature | staging 必須提供可控制的 relay target |
| Fact | CodeGraph 於 base snapshot 顯示 relay 影響集中在 Support route、module、adapter 與相關測試 | 可局部演進，不需改整包架構 |
| Decision | Support relay 是既有正式設計，必須保留 | 取消「改回 KV 自動回覆」與「移除 relay」規劃 |
| Decision | Dennis 的個人助理不是我方必要資產 | 用我方 simulator 驗證相同 relay contract |
| Fact | 已建立獨立 `KV Support Staging` LINE Bot，三個 credentials 位於 Git-ignored `.env.local` | 不需再申請 Support channel；真實 test user／room 已完成 P3 驗收 |
| Gap | 近期舊 TODO 與 `.env.example` 被誤改成 relay 非必要／待移除 | P0 必須先修正文件與設定真相 |
| Resolved | LINE Console Verify 曾回 `401`；2026-08-16 已同步 Support credentials、重部署 `kv-app`，Verify 回 `200 Success` | hosted signature boundary、真實 marker message／reply 與 cleanup 均已完成，不再是 Support blocker |
| Fact | `kv-support-relay-simulator` 已在 `kv-staging` 建立獨立 Zeabur service；主 app 透過同專案 internal target `:4010/relay` 連線 | 不覆寫 `kv-app`，不依賴公開 TLS relay domain |
| Verified | 測試者已傳送唯一 marker；simulator receipt 為 `replied`，Main staging 有 1 筆 support activity、1 筆 customer conversation、1 筆 support subscriber，Chrome `/agents/support` 顯示該訊息 | P3 functional acceptance 完成；P6 已精確清除 marker、DB rows 與 simulator receipt，residue 為 0 |
| Gap | 尚未取得 Teachify 真實 signing secret／event truth | 只阻塞 P7 Teachify row，不阻塞其他工作 |
| Fact | canonical GitHub repo 是 `fanstudents/kv`，default branch 是 `main`；產品化成果目前在 `codex/kv-wp0-toolchain` | Zeabur staging 可驗 branch，但正式 cutover 前必須先收斂 branch ownership |
| Fact | 2026-08-16 snapshot：產品化 branch 對 `main` 為 443 commits ahead／13 commits behind；merge-tree 顯示 26 個實質 conflict，涵蓋 runtime、LINE／Visit、Meeting、Teachify、CI 與 Supabase config | 不做一次性 merge，不把 upstream 舊 `src/lib` ownership 灌回新版架構；先執行 P7A |
| Fact | default branch 的 hosted `Frequent Jobs` 約每 5 分鐘執行，且所有舊 schedules 指向 `https://kva.zeabur.app`；正確 isolated staging 是 `https://kv-staging.zeabur.app` | P8 必須建立可驗證的 schedule target／owner；未核准前不得直接把正式排程切到 staging |

### Support 目標流程

```text
測試者傳 LINE
  -> KV Support webhook 驗證 signature
  -> KV 記錄 subscriber / conversation / activity
  -> KV 原樣 relay body + signature + delivery key
  -> 我方 Support Relay Simulator 模擬下游助理
  -> 基礎模式回 200；完整模式使用 replyToken 回覆 LINE
  -> DB、provider receipt、Chrome 與 cleanup 留下證據
```

## 4. 唯一執行順序

```text
P0 文件與設定真相
  -> P1 Relay Simulator
  -> P2 本機 Support contract
  -> P3 Hosted Support LINE
  -> P4 全功能 staging 驗收
  -> P5 證據驅動修正
  -> P6 集中重新驗證
  -> P7 Teachify closure 或產品 waiver（外部／決策 lane）
  -> P7A Dennis upstream reconciliation（自主 lane，可與 P7 平行）
  -> P8 release / backup / rollback
  -> P9 cleanup / handoff
```

昂貴的 Chrome、provider 與完整 staging 驗收集中在 P3、P4、P6、P8。每次改碼仍要跑便宜且高訊號的 focused test、lint 或 typecheck。

## 5. 工作包

### P0：修正文件與環境設定真相 `[done: 273a024]`

**目的：** 所有後續執行者對 Support 使用同一個正確模型。

**動作：**

1. 在 `.env.example` 恢復 `SUPPORT_RELAY_TARGET_URL`，說明它是下游助理／客服 webhook，不是 Dennis 專屬 URL。
2. 修正 `docs/PRODUCTIZATION_TODO.md` 中所有「relay 非必要、待移除、Support 自己回覆」的敘述。
3. 將舊 TODO 明確標為歷史證據文件，後續順序以本文件為準。
4. 不修改 runtime code、不填入真實 URL 或 secret。

**驗證：** `rg` 檢查所有 Support relay 敘述一致；Markdown UTF-8 正常；`git diff` 只包含文件與範例設定。

**Done When：** 找不到任何要求移除 relay 或依賴 Dennis Bot 的現行指示。已由 `273a024` 提交；P1 可開始。

### P1：建立隔離的 Support Relay Simulator `[done: 355d1d5]`

**目的：** 不依賴 Dennis 的系統，也能驗證完整 relay contract。

**先做最小決策：**

1. 用 CodeGraph／source 確認現有 acceptance helper、部署方式與 public route guard。
2. 比較兩個方案：獨立 staging service；或只在 staging 啟用且具 secret guard 的 acceptance endpoint。
3. 選擇不會在 production 誤開、可部署、可查 receipt、可精確清理的最小方案。
4. 把選擇、風險與停用方式補回本文件後再實作。

**Simulator contract：**

- 接收 KV 轉送的 raw LINE body、`X-Line-Signature`、content type 與 `X-KV-Support-Relay-Key`。
- 可用 `SUPPORT_RELAY_SIMULATOR_OUTCOME=success|reject|timeout` 模擬 `200`、timeout 與 non-2xx；network failure 以停止 simulator 或錯誤 target URL 模擬。
- 保存有界、可清理的 acceptance receipt；不得保存 channel secret 或 access token。
- 完整模式可取出 `replyToken`，使用 Support channel 回覆唯一測試文字。
- 只有明確 acceptance opt-in、環境限制與 secret guard 全部成立時才能回覆 LINE。
- 測試 marker、收件人 allowlist 與 cleanup 必須精確；不得影響正式使用者。

**已落地的最小實作：** `scripts/support-relay-simulator.mjs`，以 `npm run support:relay:simulator` 啟動；預設 `ack` 模式，`reply` 模式必須同時設定 `LINE_SUPPORT_CHANNEL_ACCESS_TOKEN` 與 `SUPPORT_RELAY_SIMULATOR_TEST_MARKER`。它只保存精簡 receipt，不保存 raw body／user ID；`/receipts` 需要 `SUPPORT_RELAY_SIMULATOR_SECRET`，`/relay` 會驗證原始 LINE signature 與 `body:<sha256>` delivery key。`Dockerfile.support-relay-simulator` 可將它獨立部署成 staging service；這是 acceptance tooling，不是正式 Support module。

**驗證證據：** `tests/unit/support-relay-simulator.test.ts` 4 個測試通過；`npm run lint`、`npm run typecheck` 通過。P1 code 由 `355d1d5` 提交，adapter transport 由 `0319a55` 補強。hosted service 的 domain／owner 已由 P3 設定，不把 secret 寫入 repo。

### P2：完成本機 Support contract 與資料整合 `[done: 4dbecfb]`

**目的：** 在真人 LINE 測試前先關閉可低成本發現的錯誤。

**動作與驗證：**

- valid／invalid signature、invalid payload、空事件、非文字事件。
- subscriber touch、conversation 與 activity 寫入。
- relay body、signature、delivery key 與 content type 沒有被改壞。
- relay success／timeout／network／rejected 的 failure kind 正確。
- relay 成功但 audit／DB 寫入失敗時，不誤報為安全可重送。
- valid webhook 維持 `200 ACK`；invalid signature `401`、invalid payload `400`。
- 使用唯一 marker 寫入 Main staging，驗證後精確清除為 0。
- 跑 Support focused tests、lint、typecheck；用 CodeGraph 確認沒有多出無理由的 layer。

**驗證證據：** `tests/unit/support-relay-simulator.test.ts` 4 tests passed；`npm run test:unit` 140 files／725 tests passed；`npm run lint`、`npm run typecheck` passed；一次性 `SUPPORT_MAIN_ACCEPTANCE=1 npm run acceptance:support:main` 2 tests passed，Main conversation／subscriber／activity cleanup 為 0；再以 `SUPPORT_ROUTE_ACCEPTANCE=1 npm run acceptance:support:route` 實際呼叫 Support webhook route，1 test passed，驗證真實 Support signature、Main staging capture、HTTP simulator receipt／delivery key 與 cleanup residue 0。P2 原始 adapter evidence 由 `0319a55` 提交，route evidence 由 `4dbecfb` 提交。

**Done When：** adapter 已透過真實本機 HTTP simulator 重跑，Main staging fixture 已精確清除；P3 可開始。

### P3：Hosted Support LINE 真實流程 `[done]`

**目的：** 證明真實 LINE event 可以經 KV relay 到模擬下游並回覆測試者。

**動作：**

1. 以 `Dockerfile.support-relay-simulator` 建立獨立 staging service；不要覆寫主 `kv-app` service。
2. 設定 simulator 的 `SUPPORT_RELAY_SIMULATOR_SECRET`、`LINE_SUPPORT_CHANNEL_SECRET`、`SUPPORT_RELAY_SIMULATOR_MODE`；reply mode 另需 Support access token 與唯一 test marker。
3. 用 simulator `/health` 確認 service；將主 app 的 `SUPPORT_RELAY_TARGET_URL` 設為 simulator `/relay`。
4. 部署 P1～P2 exact commit 到隔離 staging，並同步三個 Support LINE credentials；不在輸出中顯示值。
5. 用主 app `/api/version` 與 `/api/health` 確認 commit／環境；LINE Console Webhook Verify 必須從 `401` 變成 `200`。
6. 請使用者用 test user／room 傳一則帶唯一 marker 的訊息。
7. 驗證 LINE inbound receipt、KV DB rows、simulator relay receipt 與真實 LINE reply。
8. 用 Chrome 檢查 `/agents/support` 的 loading、成功、活動與對話狀態，UI 外觀不變。
9. 精確清除測試 DB／simulator receipt，確認殘留 0。

**目前狀態：** 本地 deployment prep 由 `2266d5f` 完成，simulator failure modes 由 `e74ca31` 補齊；2026-08-16 已在 Zeabur `kv-staging` 建立獨立 `kv-support-relay-simulator` service（GitHub source `cablate/kv-support-relay-simulator`，public domain `kv-support-relay-staging.zeabur.app`，主 app 實際使用同專案 internal target），並以 `reply` mode 啟動。`kv-app` 已部署 `docs: record support route acceptance` revision、同步 Support credentials；LINE Console Verify 回 `200 Success`，hosted simulator `/health` 回 `200`。測試者已傳送 `KV-RELAY-20260816`，simulator receipt 回 `replied`；Main staging 查到 1 筆 support success activity、1 筆 customer conversation 與 1 筆 support subscriber；Chrome `/agents/support` 已顯示該訊息。P3 的功能驗收完成；P6 已精確清除測試 DB rows、marker 與 simulator receipt，residue 為 0。

**P3 hosted evidence：** Zeabur simulator `/health` 回 `200`；`kv-app` 的 `LINE_SUPPORT_CHANNEL_ID`、`LINE_SUPPORT_CHANNEL_SECRET`、`LINE_SUPPORT_CHANNEL_ACCESS_TOKEN` 與 `SUPPORT_RELAY_TARGET_URL` 已由環境變數設定並重部署；LINE Console Webhook Verify 回 `200 Success`；真實 marker message 進入 KV webhook，simulator `/receipts` 回 `200` 且最後結果為 `replied`；Main staging 與 Chrome evidence 已對上。P6 已精確清除測試資料／receipt，residue 為 0；Teachify 真實 signing secret 仍是獨立 P7 gate。

**失敗處理（驗收前置）：** 在真實 receipt 尚未證明前，不新增 generic retry；先定位是 LINE、KV、DB、relay 還是 simulator owner。

**Done When：** provider receipt、DB diff、Chrome 與 reply 四項功能證據齊全；P6 已完成測試資料／receipt 的精確 cleanup，residue 為 0。提交 evidence commit。

### P4：集中完成九月全功能矩陣

每列都需記錄輸入、API、DB、provider、Chrome、cleanup 與失敗 owner；fixture 或 mock 不得冒充 provider receipt。

| 能力 | 必驗收行為 | 真實外部 gate |
|---|---|---|
| Auth／Integrations | login、health、version、provider 狀態與錯誤真相 | hosted exact commit |
| Agent／Chat | 既有 Agent 頁與 OpenAI chat 關鍵操作 | OpenAI 已有 credentials |
| Visit | Primary LINE inbound、名片、研究、邀約、Calendar、Gmail、postback／timeout | 測試 LINE user |
| Orders | normalize、Main persistence、claim／replay、Primary LINE | Teachify 真實 signature 延至 P7 |
| Knowledge Base | crawl、import、review／publish、index、search | Firecrawl／OpenAI 已有 credentials |
| Support／Subscribers／Broadcast | Support relay、subscriber、conversation、broadcast／report | P3 test user／room 已完成；P6 重驗與 cleanup |
| Meeting | session、turn、realtime／audio、finish、context | OpenAI／Google |
| Goals／Checklist | create、update、history、cleanup | Main staging |
| Reporting／Operations | Teaching read-only、report、hosted cron auth | schedule owner 延至 P8 |
| Live Task／TV／Projection | live／demo 顯示、失敗不冒充空資料 | Chrome staging |

**Done When：** 每列為 Done、Blocked 或 Not required，且 Blocked 有精確外部輸入與安全可繼續工作。提交 acceptance ledger commit。

#### P4 第一輪 acceptance ledger（2026-08-16）

本表只記錄可重跑的證據。Unit、fixture 或 mock 只能證明 contract，不等於真實 provider；`Done` 代表該列在本輪核准範圍內已有 input、API／DB、provider 或 Chrome 證據及 cleanup 結果，並不等於整個 release 已完成。

| 能力 | 狀態 | 本輪證據 | Cleanup／仍缺輸入 | Failure owner |
|---|---|---|---|---|
| Auth／Integrations | Done | current HEAD production build 通過；Playwright smoke 147／147；Chrome 本機 production build 可登入；正確 staging `https://kv-staging.zeabur.app/api/health` 為 `ok`；P5 部署 `48f8d95` 後 `/api/version` 精確回傳完整 SHA，Main privileged 與 deployment identity 皆 configured；Chrome 顯示 9 個已連線服務，缺 secret 的 Teachify 為「未連線」 | 舊 `kva.zeabur.app` 不是本 staging canonical host；Teachify 真實 provider gate 仍由 P7 關閉 | Auth／proxy、integration status、Zeabur deploy owner |
| Agent／Chat | Done | 57 個 focused tests 通過；OpenAI acceptance 1／1；Chrome 以 current local production build＋staging Main＋真實 OpenAI 從 dashboard 對 Vivian 發訊息並收到唯一 P4 回覆 | 無 chat fixture；AI usage audit 依產品紀錄保留 | Agent chat route、OpenAI adapter、context owner |
| Visit | Blocked | Visit／Orders／Meeting batch 229 tests 通過；Google write 2／2、Visit delivery 1／1、Primary LINE 1／1；2026-08-17 真實 Primary LINE 名片完成 OCR、contact／offer、決策與核准卡、Gmail、公開時段回覆、Calendar、感謝信、LINE 通知、背景研究及 Chrome TV 投影；terminal step ledger 已修復並回填；hosted timeout 第一次 `handled=1`、第二次 `handled=0`，Primary LINE 僅推送一次，fixture residue 為 0；相同 offer 的 recovery 使用固定 LINE retry key，官方 duplicate-accepted `409` 會繼續完成 checkpoint | Happy path、ledger truth、timeout no-duplicate 與受控 recovery contract 已完成；只剩既有 happy-path fixture／Calendar cleanup。為避免額外不可逆推播，不刻意製造真實 LINE duplicate receipt | Visit workflow、Primary LINE、Google、cron owner |
| Orders | Blocked | Orders staging DB 1／1；Primary composites 3／3，包含 normalize、Main persistence、delivery ledger、Primary LINE 與 cleanup | 缺 Teachify 官方 signing secret、header／algorithm、去識別真實 event 與 replay ordering；由 P7 closure 或 waiver | Teachify contract、Orders ledger、Primary LINE |
| Knowledge Base | Done | KB focused tests 通過；staging atomic index 2／2；Firecrawl＋OpenAI acceptance 1／1 完成 crawl、draft、publish、index、semantic search；Chrome KB 頁正常 | DB fixture 已清除；Firecrawl credit／OpenAI usage不可逆但受 gate 限制；PDF／site crawl 屬後續擴充驗收 | KB domain、Firecrawl、OpenAI、Main RPC |
| Support／Subscribers／Broadcast | Done | P3 hosted Support marker／reply、simulator receipt、Main rows 與 Chrome 已完成；本輪 Primary composites 真實 broadcast 通過；Chrome Support／Subscribers 頁正常 | P6 已清除 marker、Main rows 與 simulator receipt，residue 為 0；不可逆 LINE receipt 以 marker 識別 | Support relay、subscriber/broadcast、Primary／Support LINE |
| Meeting | Blocked | Meeting contract 與 failure-boundary tests 通過；OpenAI、Google read／write provider primitives 通過；Chrome Meeting 頁正常 | 缺真實 Chrome mic／WebRTC、realtime、TTS／STT、finish／recording cleanup；需測試者允許媒體權限 | Meeting session／storage、OpenAI realtime、Chrome media |
| Goals／Checklist | Done | Goals／Checklist focused tests 通過；Chrome 對 staging Main 建立唯一 Goal 後刪除，residue 0；Checklist 由 0／16 切為 1／16 再還原 0／16，class 與 DB 狀態回復 | Goal fixture residue 0；Checklist 已還原原值 | Goals／Checklist service、Main repository |
| Reporting／Operations | Blocked | Google read 4／4；Primary composite 含 Team Lead report；Chrome 顯示 GA4 live projection與 Teaching read-only 真實專案資料 | 缺 hosted cron schedule、通知與失敗 owner；`metric-snapshot` 仍是 demo source，不得冒充 GA4／GSC pipeline | Reporting、Teaching adapter、cron／schedule owner |
| Live Task／TV／Projection | Done | 47 個 focused tests與 live/demo/failure projection E2E 通過；Chrome Live／TV／Outputs／AI usage surfaces 正常渲染；P5 source review 確認 live mode 走 `RealStatusPanel`，只有 explicit demo mode 才會使用 idle demo scenes | 無新增 fixture；沒有發現 provider failure 冒充 demo 的缺陷，因此不做推測式修改 | Live Task repository、TV projection owner |

**共同證據：** CodeGraph 483 files／4,222 nodes／10,620 edges，無 drift；Luna Max 唯讀盤點後，focused unit 共 129 file runs／703 test runs 全通過，另一次完整 unit 為 140 files／725 tests 全通過；production build 通過；Playwright smoke 147／147；四組 staging DB integration 共 6 tests 全通過；OpenAI、Google read／write、Visit delivery、Primary LINE、Primary composites、KB provider acceptance 全通過。Chrome 以 current HEAD production build 巡覽 dashboard、integrations、Visit、Orders、KB、Support、Meeting、Goals、Todos、Subscribers、Operations、Reporting、TV、Outputs 與 AI usage。

**P4 經 P5 收斂後的結論：** 6 列 Done、4 列 Blocked。Blocked 都有精確外部 gate；不能把缺外部素材改寫成假完成。

### P5：只修 P2～P4 暴露的問題

**允許：** provider-specific dedupe、receipt、timeout、partial failure、reconciliation、錯誤顯示、重複 ownership 與證明無價值的 forwarding layer。

**禁止：** 通用 workflow engine、universal retry、每 route 四層、無第二 consumer 的 registry、推測式搬完整 `src/lib`、UI redesign。

每個修正先寫 change contract，確認 entrypoint、owner、caller、side effect、before evidence 與 rollback；只移動這次需求碰到的行為。

**Done When：** 每項修改都能指回一個真實失敗或已核准需求；沒有純命名或檔案數驅動的重構。每個 coherent outcome 一個 commit。

#### P5 execution ledger（2026-08-16）

| 證據 | 結果 |
|---|---|
| Teachify integration truth | P4 Chrome 發現未提供 `TEACHIFY_WEBHOOK_SECRET` 時仍顯示「連線中」；`48f8d95` 將狀態改為未連線並補 regression test，不改 webhook contract |
| Repo verification | integration status focused tests 3 files／9 tests、lint、typecheck 全通過 |
| Hosted identity | Zeabur 新 revision 運作中；`/api/version` 精確回 `48f8d9521bfbb38539e5c242eb4f229184eea04f`，`/api/health` 為 `ok` |
| Chrome verification | `/integrations` 正常渲染；摘要為 9 個服務連線中，Teachify 卡片為「未連線」 |
| TV fallback review | source 確認 live mode 使用 `RealStatusPanel`；idle demo scenes 只在 explicit demo mode 啟用，沒有真實缺陷，不改碼 |

**P5 結論：** 只修一個由實機驗收證明的狀態錯誤；另一個疑點經 source review 排除。未新增 registry、port、adapter、通用 retry 或其他抽象，P5 完成並進入 P6。

### P6：集中重新驗證

1. 重跑受影響 focused tests、integration、lint、typecheck、build。
2. 部署 exact commit，重跑受影響 provider journey。
3. 用 Chrome 跑真正受影響的頁面與完整後台關鍵矩陣；不得用 `/agents-catalog` 代替。
4. 確認所有 fixture、暫時 settings、allowlist 與 simulator receipt 已還原或清除。
5. 更新本文件的 evidence 與未完成 gate，不新增執行日誌文件。

**Done When：** 修正沒有破壞 UI／API／data contract，且失敗能追到明確 owner。

#### P6 execution ledger（2026-08-16）

| 證據 | 結果 |
|---|---|
| Complete repo verification | lint、typecheck、production build 通過；140 unit files／726 tests 全通過；Playwright smoke 147／147 |
| Main staging integration | 4 個 suites／6 tests 全通過：Agent run atomic cost、Orders persistence、conversation lock、KB atomic replacement |
| Safe integration entrypoint | P6 發現 generic `npm run test:integration` 會把未開 opt-in gate 誤報為失敗；`a49c787` 修正為無 gate 時 4 suites／6 tests 明確 skip，有 gate 時仍 6／6 真跑通過，不降低 allowlist 或 cleanup 護欄 |
| Hosted application | `kv-staging.zeabur.app` health／version、authenticated Chrome `/integrations` 與 `/agents/support` 正常；Teachify 持續如實顯示未連線 |
| Support cleanup | 只匹配 `KV-RELAY-20260816`：conversation、activity、support subscriber 各由 1 筆刪至 residue 0；Chrome 不再顯示 marker |
| Simulator cleanup | hosted simulator 重啟後 `/health` 為 `ok`、`reply` mode，receiptCount 由 3 歸零 |

**P6 結論：** repo、Main staging、瀏覽器與 cleanup 證據一致。沒有新的產品行為回歸；下一個停止點是 P7 的 Teachify 外部資產或產品 waiver。

### P7：關閉 Teachify 外部 gate

**有真實素材時：**

1. 取得官方 signing secret、去識別可重播 event、event ID／timestamp／狀態語意。
2. 驗證 signature -> Orders persistence -> exact replay／concurrency -> Primary LINE -> cleanup。
3. 依真實事件決定 stale／out-of-order 行為；不得由 fingerprint 猜 provider 語意。

**仍無素材時：**

- 產品負責人必須明確選擇延後 Teachify，或核准以「本地 contract 完成、真實 provider 未驗證」交付。
- 此 waiver 必須寫明使用限制、重新開啟條件與 owner；mock 不得標成完成。

**Done When：** 真實 provider 證據完成，或產品 waiver 已核准並反映在 release scope。

### P7A：Dennis upstream reconciliation

**目的：** 把 Dennis 在 merge-base `359d4c9` 之後的 13 個 commits 映射進產品化架構，保留新產品行為，但不恢復已移除的 legacy ownership。

| Slice | Upstream 行為 | 處理方式 |
|---|---|---|
| U1 Runtime／Operations | runs 頁、agent tasks、retry、alert、maintenance、cron、runtime hardening migration | 先比對現有 `agent_runs／steps／tasks／locks` baseline 與 modules；只補缺少的 use case、route、projection 與 recovery，不複製舊 `src/lib` runtime |
| U2 Visit／Research／TV | 名片旋轉、Firecrawl fallback、LINE 點擊卡片、行前功課圖文同步／保鮮期／社群連結 | 依 Visit 與 TV domain owner 逐條移植；每條保留現有 UI contract，跑 Primary LINE／Chrome affected journey |
| U3 Brand／Showcase | MixAgent／原騰科技名稱、super-agent showcase | 品牌文字需產品決策；展示頁若核准則獨立 UI slice，不與 runtime 合併 |
| U4 Repo／Deployment | upstream CI、frequent schedules、Supabase config | 保留目前已驗證的 CI／migration baseline；逐項吸收缺口，不覆寫 staging identity 或 migration history |

#### P7A-U1 outcome（2026-08-16）

| 上游內容 | 結論 | Current owner／理由 |
|---|---|---|
| runtime hardening migration | Superseded | 現有 baseline 已包含 `agent_runs／steps／tasks`、AI usage `run_id`、原子成本 RPC、task claim／stale requeue 與 retry 欄位，不重複新增 migration |
| 全隊執行紀錄與單次細節 | Integrated | 新增 `modules/agent-runtime/history.ts` 與 Supabase adapter；`/runs`、`/runs/[id]` 用 server-rendered read model 顯示步驟、產出與 AI 用量，DB 錯誤明確顯示，不偽裝成空資料 |
| `/api/runs*` read routes | Superseded | 目前只有後台頁 consumer；server page 直接經 module／adapter 讀取，避免再造一組單 caller API forwarding layer |
| 手動／自動 replay registry | Rejected for now | Support／LINE／報表等副作用尚未各自證明 replay-safe；不得用通用 retry 造成重複通知。Orders 已有自己的 delivery claim／reconciliation owner |
| agent task worker／maintenance | Rejected for now | CodeGraph 顯示 `delegate`、`claimTasks`、`remember`、`forgetExpired` 目前沒有 production caller；先不部署無 producer 的 worker／cron |
| cron alert endpoint | Deferred to U4 | 必須先決定外部通知通道、schedule target 與 release owner；主 app 掛掉時同 app alert route 也不可用 |

**U1 evidence：** CodeGraph 確認 `startRun` 只有 Visit research／Visit runtime 兩條 production caller，`delegate`、`claimTasks` 與 `forgetExpired` 為 0 caller；focused unit 8／8、UI inventory 6／6、lint、typecheck、production build 通過；Playwright `/runs` 與 `/runs/[id]` anonymous／authenticated 4／4。Chrome 已確認 protected redirect 到真實 `/login`；登入後 live DB 畫面待既有 Chrome session 完成登入後補驗，不影響 U2 純程式工作。

#### P7A-U2-A outcome（2026-08-16）

| 上游內容 | 結論 | Current owner／理由 |
|---|---|---|
| LINE 邀約點擊卡片 | Integrated | `modules/visit` 持有核准／取消流程；LINE UI builder 只負責訊息格式，並以 pending invite id 擋下過期卡片 |
| 名片方向校正 | Integrated | OCR 前先用便宜的獨立視覺判取得 0／90／180／270，再由 `sharp` 校正同一張圖片；不把方向猜測塞回業務規則 |
| 公司研究 Firecrawl fallback | Integrated | OpenAI 搜尋缺少公司摘要時才啟用 Firecrawl；失敗保持 non-fatal，仍保存既有研究結果；提示詞改為近期 7 天且排除資本額 |
| TV 行前功課圖文同步／保鮮期／社群連結 | Delegated to U2-B | 與 TV projection 共用狀態與畫面 ownership，下一批由單一 Luna Max worker 完成，避免和本批 Visit workflow 重疊修改 |

**U2-A evidence：** focused unit 7 files／36 tests、lint、typecheck、production build 通過。真實 Primary LINE 圖片與按鈕副作用驗收留在 U2 完整批次集中執行，避免重複傳訊與污染 staging。

#### P7A-U2-B outcome（2026-08-17）

| 上游內容 | 結論 | Current owner／理由 |
|---|---|---|
| Visit research flow nodes | Integrated | 流程圖使用現行 runtime 的 `research-search／research-firecrawl／research-store`，不複製上游舊 node id |
| TV 行前功課圖文同步 | Integrated | 研究摘要取自同一個 run step；代表圖沿用 `agent_artifacts`，以 `runId + nodeId` 綁定，不借用 Agent 共用名片圖 |
| 研究完成後保鮮期 | Integrated | TV client 保留最後投影 5 秒並拒絕過期 response；不在 server worker 加固定 sleep |
| Firecrawl 社群連結／代表圖 | Integrated | 只保留公開頁面中可信的社群 URL 與 `og:image`；圖片失敗為 best-effort，文字研究結果仍成立 |

**U2-B evidence：** focused unit 6 files／42 tests、typecheck、lint、production build 通過；Playwright TV projection 5／5，包含同 run/node 圖文與 5 秒 bounded hold。Chrome 已以真實登入 session 進入 dashboard、`/agents/visit` 與 `/tv`；TV 可暫停輪播、開啟值勤團隊並進入 Coco 詳情，顯示 Gmail／Calendar／Primary LINE 3／3 已連線與研究節點。

#### Primary LINE Visit real journey（2026-08-17）

- 真實 journey 執行時，`kv-staging.zeabur.app` 精確對齊 commit `467b6c8ac83eed85084971e63900299f3ba6c016`、schema `20260814164718`，health 為 `ok`；Primary channel webhook 指向 `/api/line/webhook`、Verify 200 且 Use webhook 已啟用。後續 terminal step backfill migration 已將 staging schema 推進到 `20260816175456`。
- 真實 LINE 圖片建立唯一 `line-card:*` run，OCR 寫入 contact／pending offer；LINE 決策卡「要」建立 `awaiting_approval` invite。為避免接觸名片第三方，寄送前把 staging contact 與 invite 收件人改成核准測試信箱，主旨加 `[KV Staging Acceptance]`。
- 使用者核准後 Gmail 真實送達；公開回覆選擇 `8/20（四）09:00`、地點「公司」，Google Calendar event `mkj7dletaoeqk8dr3iu8flbsl4` 為 confirmed，時區 `Asia/Taipei`，invite `fulfilment_phase=completed` 且沒有 fulfilment error；使用者收到 Primary LINE 完成通知。
- 背景研究 run 成功，保存 5 個公開連結、2 則近況與 4 個 talking points；Chrome TV ticker／Coco 詳情顯示名片、已寄邀約、行事曆／感謝信與研究完成。
- 本次暴露並修正的 runtime ledger defect：`finishRun` 現在會把同一 run 的 open steps 依 terminal run status 映射為 `done／failed／skipped`，step cleanup 失敗仍不阻斷 run 結案；focused 57 tests、完整 unit 751 tests、typecheck、build 與真實 Main staging integration 2／2 通過。Migration `20260816175456_backfill_terminal_agent_run_steps.sql` 已回填既有 terminal runs，三筆 Visit run 的 open step 均為 0；Chrome `/runs/[id]` before 顯示 `running／waiting`，after 七步全為 `done`。測試中途替換收件人所留下的舊 Email activity 屬 staging fixture 操作紀錄，cleanup 時一併移除，不以全域歷史重寫處理。
- Hosted timeout acceptance 使用唯一 marker 建立一筆過期 offer，未建立 pending invite，因此不會觸發 Gmail／Calendar。第一次 authenticated cron 回 `handled=1`，offer 進入 `declined／completed` 且 Primary LINE 真實推送一次；第二次回 `handled=0`，activity 仍為 1，證明同 fixture 不重複通知。contact／offer／activity／lock／逾時 live-task marker 均已精確清除，residue 與 active Visit run 都是 0；Chrome `/agents/visit`、`/runs`、`/tv` 正常且未殘留 timeout marker。這次實測暴露「LINE push 成功、但 `line_notified` phase 寫回失敗」的 recovery 邊界，後續以受控 provider／repository failure test 關閉，不用 live cron 猜測。
- Recovery 已依 LINE 官方 retry contract 關閉：timeout delivery 以持久化 `visit_offers.id` UUID 作為 `X-Line-Retry-Key`；同一 offer 的 recovery 重用同 key，不同 offer 使用不同 key。只有「有 retry key、HTTP 409、且帶 `x-line-accepted-request-id`」才視為先前已接受並繼續寫入 `line_notified／completed`；其他 409 仍失敗。Focused transport／adapter／application tests 17／17 通過，未用 live provider 製造第二次不可逆推播。

#### CI schema gate closure（2026-08-17）

- Run `31954733613` 的 quality job 全綠；schema migration rehearsal 成功。
- 紅燈來源是 committed `database.types.ts` 與 pinned Supabase CLI `2.110.0` 輸出不同，不是 migration 失敗。
- 更新 canonical generated types，並將換行正規化成跨 Windows／Linux 可重現的單一格式。
- migration replay、schema scope classifier 與完整 type drift blocking gate 全部保留；CLI 缺失、生成失敗、空輸出或真實型別差異仍會失敗，禁止用 skip／allow-failure 假綠。
- Hosted CI run `31958177873` 已在 commit `44ccb9b` 驗證：schema 2m19s 全綠；quality 3m18s 全綠，包含 152 個 test files／browser smoke。

#### P7A upstream snapshot ledger（2026-08-17）

以下逐一封存 `359d4c9..d958a0b` 的 13 個 upstream commits。`Integrated` 只表示行為已由 U1／U2 以 current owner 重作並有對應證據；同一 commit 若包含不同責任，按行為拆記，不直接合併或 cherry-pick。

| Commit | Upstream scope | Verdict | Current evidence／owner／next action |
|---|---|---|---|
| `a1305dc` | 全站品牌由 TBR 改為 MixAgent | Decision required | Current dashboard／catalog／TV／登入仍保留既有 TBR／原騰標籤；品牌與公司名稱不是工程推定，等待產品決策。 |
| `831ae02` | Runtime、runs、retry／task／maintenance／alert、CI 與 schedules | Mixed：Integrated／Superseded／Rejected／Decision required | Runs read model 已由 `ab75fa` 在 `modules/agent-runtime` 接管；migration、單 caller `/api/runs*` 與無 producer task worker 依 U1 Superseded／Rejected。上游 CI 已被 current quality＋schema blocking workflow supersede；frequent／daily schedules 仍缺 canonical target、外部通知與 owner，留待 U4／P8 決策。 |
| `db22f74` | 品牌補上「原騰科技 MixAgent」 | Decision required | 與 `a1305dc` 同屬公開文字／公司抬頭變更；不改現有 TBR／原騰標籤，等待同一產品決策。 |
| `6aff549` | EXIF 圖片轉正、Realtime 計價、Super Agent showcase | Mixed：Superseded／Rejected／Decision required | EXIF 顯示已由 Visit `prepareBusinessCardImage` 在寫入 live projection 前處理，避免再於 image route 重轉；Realtime 2.1 文字價格是已確認錯誤，依歷史 TODO Rejected；`/super-agent-showcase` 是獨立公開 UI，等待產品核准後另開 slice。 |
| `7ac549c` | 名片方向由視覺判斷後校正 | Integrated | `modules/visit`／Visit image adapter 先判斷 0／90／180／270，再以 `sharp` 校正同一張圖片；U2-A 36 focused tests 通過。 |
| `aad8332` | 公司研究缺摘要時 Firecrawl fallback | Integrated | 現行 Visit research owner 只在摘要不足時啟用 Firecrawl，失敗保持 non-fatal；U2-A 已驗證。 |
| `b0fb87a` | Firecrawl 轉為明確分流節點 | Integrated | 現行 run 使用 `research-search` → `research-firecrawl` → `research-store`；U2-B 以 current node ids 封口。 |
| `fa9da32` | LINE 點擊邀約卡、名片回歸修正、TV 行前功課接線 | Integrated | Invite approval／cancel 由 `modules/visit` 持有；TV projection 由 current run／artifact owner 持有；U2-A／U2-B focused evidence 已完成。 |
| `6ac0d7d` | TV 行前功課圖文一起顯示 | Integrated | 摘要與代表圖以同一 run／node projection 顯示；U2-B Playwright 5／5 通過。 |
| `6efca34` | TV 文字與 nodeId 綁定，修正競態 | Integrated | `LiveTask` 以 current step 的 `runId + nodeId` 綁定文字與圖片，拒絕舊 response；U2-B 已驗證。 |
| `70170ae` | 行前功課完成後 hold，後端收尾等待 | Superseded | Current TV client 使用 bounded 5 秒 hold 與 stale-response guard；不採上游 server 固定 sleep，避免 worker 佔用與跨部署 timing 假設。 |
| `98bcafc` | 修正文圖對應並補社群連結 | Integrated | Visit research 只保留可信公開社群 URL／`og:image`，代表圖以 run／node artifact 投影；圖片失敗不影響文字結果。 |
| `d958a0b` | 預設 Supabase CLI `config.toml`／`.gitignore` | Superseded | Upstream `agent-kv` 與預設 5432x／seed 設定會混淆 project identity；current `supabase/config.toml` 是 local-only `project_id = "kv"`、隔離 5442x ports、seed disabled，migration history 與 staging identity 保持不變。 |

**U3 conclusion：** `a1305dc`、`db22f74` 與 `6aff549` 的 showcase hunk 全部 Decision required；沒有品牌或公開 UI code churn。

**U4 conclusion：** upstream CI 行為已由 current `.github/workflows/ci.yml` 的 quality／schema gates 覆蓋；upstream frequent／daily schedule 的 `https://kva.zeabur.app` target 與同 app alert fallback 沒有 current release owner／failure channel 證據，不能直接改指向 `kv-staging.zeabur.app`，也不新增無 owner 的 workflow。`supabase/config.toml` 已有更安全的 current local rehearsal 形狀，不覆寫。

**執行規則：**

1. 固定 upstream snapshot `d958a0b`；後續新 commit 另開增量，不讓 scope 持續漂移。
2. 每個 slice 以 upstream commit diff 當 requirement evidence，再用 CodeGraph 映射到 current owner。
3. 禁止直接 merge／cherry-pick 造成 route 與 `src/lib` 雙 ownership；行為要以 current modules／adapters 重作最小 patch。
4. 每個 slice 各自跑 contract、affected Chrome、staging cleanup 與 coherent commit。
5. 所有 slice 收斂後才建立 PR／protected-main cutover；在此之前 staging 仍追蹤產品化 branch。

**Done When：** 13 個 upstream commits 每一個都有 Integrated、Superseded、Rejected 或 Decision required 結論；核准行為已進 current owner 並通過 affected acceptance，merge-base drift 已清楚封存。

### P8：Release、backup 與 rollback

- 決定 canonical GitHub repo、protected branch 與 deploy owner。
- hosted CI 對 exact commit 執行 install、lint、typecheck、unit、build、schema replay 與 Playwright smoke。
- 保存 migration promotion／history 證據。
- 建立 Main Supabase backup，實際驗證 restore path。
- 分開演練 app rollback 與 DB forward-fix；不得對不明 Zeabur target 做破壞性操作。
- 確認 scheduled workflows 的 secret、部署 URL、通知與失敗 owner。
- 輪替曾在聊天中出現過的 OpenAI key。

**Done When：** 另一位工程師只靠 release artifact／runbook 可部署、辨認版本、診斷並回退。

### P9：Cleanup 與交接

- 移除已到 exit condition 的 simulator flag、fixture、暫時 allowlist、stale docs、dead code 與測試。
- 保留仍屬產品 contract 的 Support relay；不得為減檔案刪除。
- 更新 CodeGraph、source map、環境變數表、runbook 與最後 readiness。
- 跑完整 CI、provider matrix、Chrome matrix 與 cleanup query。
- 確認 worktree 乾淨，所有 commit 可追溯到本文件 work package。

**Done When：** 下一位工程師能定位 owner、重跑核心 journey、發布、診斷和回退；沒有無 owner 的 transitional path。

## 6. 執行規則

### 每批修改前

1. CodeGraph 查 entrypoint、caller、impact 與現有 owner。
2. 直接讀 current source 與相關測試，Graph 只作導航證據。
3. 寫清楚 change contract：什麼保持不變、什麼刻意改變、最高風險失敗與 rollback。

### 每批修改後

1. 跑便宜且高訊號的 focused checks。
2. 到 domain 邊界才批次跑 Chrome／provider／完整 staging。
3. 提交一個 coherent outcome。
4. 更新本文件的狀態與證據；不要新增第二份 TODO 或執行日誌。

### 抽象檢查

只有下列證據至少一項成立才保留新 boundary：多個 production consumers、外部 provider 翻譯、transaction／lock／idempotency／recovery、非平凡 payload／error mapping、或多副作用 orchestration。單 caller 純轉發、測試專用 consumer 與未來可能需求都不成立。

## 7. 外部輸入與安全平行工作

| 外部輸入 | 阻塞內容 | 不阻塞內容 | 關閉證據 |
|---|---|---|---|
| Support test user／room | 已完成；不再阻塞 | P7 Teachify、P8 release／owner work | LINE receipt + DB + simulator + Chrome + cleanup 已完成 |
| Teachify secret／event truth | P7 provider closure | P0～P6、P8 repo-local 工作 | 真實 signature／event／replay evidence |
| Canonical repo／Zeabur owner | P8 promotion／rollback | 所有本機與隔離 staging 工作 | exact commit deploy + owner sign-off |
| Backup／schedule owner | P8 release closure | code、tests、acceptance | restore／failure notification rehearsal |

## 8. 最終驗收與回復原則

| 層級 | 必須證明 |
|---|---|
| Structural | types、dependency、owner、env names 與 migration order 正確 |
| Contract | input、output、錯誤、partial failure 與 cleanup 規則成立 |
| Integration | Main DB 與真實 adapters 可以合作 |
| Behavior | 使用者從真正入口完成受影響流程，Chrome 顯示正確 |
| Production-like | provider、duplicate／retry、deploy、backup、rollback 與 owner 有證據 |

任何 package 失敗時，先停止該 package 的部署或 side effect。回退該 coherent commit；若外部副作用已發生，先 reconcile，不可盲目重送。資料 migration 採 forward-fix，應用程式回退與 DB 回復分開處理。

## 9. Readiness Verdict

### Verdict：Needs Revision（完整 release）；P7A U3／U4 ledger ready

**下一個可執行工作包：** P7 Teachify closure 或產品 waiver；完成後進入 P8 canonical release／backup／rollback owner package。P7A U3／U4 已完成 current-source reconciliation，沒有待做的 runtime patch。

**完整 release 尚未 Ready 的原因：**

- Support hosted flow 已完成：simulator URL／owner、真實 test user／room marker receipt、DB／Chrome evidence 與 P6 cleanup 均已確認，不再是 release blocker。
- Primary LINE Visit 的真實 image、兩段 postback、Gmail、Calendar、LINE 通知、背景研究、Chrome TV happy path、hosted timeout no-duplicate 與受控 recovery contract 已完成；只剩既有 happy-path fixture／Calendar cleanup。
- P7 缺 Teachify provider truth 或產品 waiver。
- P8 缺 canonical repo／deploy owner、Main Supabase backup／restore、schedule failure notification 與 app rollback owner evidence。

這些剩餘缺口不阻止 P7A 文件／本機 reconciliation 工作；它們阻止完整 release readiness 與正式 cutover。
