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
| Base commit | `a1f502f891c4d6cfa8b412ec184f09043f751dcb` |
| Last verified | 2026-08-16 |
| Release intent | 九月底 production slice：現有功能全部納入，不新增平台功能 |
| Readiness | 第一個工作包 Ready；完整 release 仍 Needs Revision，原因見第 9 節 |

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
| Fact | 已建立獨立 `KV Support Staging` LINE Bot，三個 credentials 位於 Git-ignored `.env.local` | 不需再申請 Support channel；仍需真實 test user／room |
| Gap | 近期舊 TODO 與 `.env.example` 被誤改成 relay 非必要／待移除 | P0 必須先修正文件與設定真相 |
| Gap | LINE Console Verify 曾回 `401` | hosted Support secret／部署版本尚未完成驗收 |
| Gap | 尚未取得 Teachify 真實 signing secret／event truth | 只阻塞 P7 Teachify row，不阻塞其他工作 |

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
  -> P7 Teachify closure 或產品 waiver
  -> P8 release / backup / rollback
  -> P9 cleanup / handoff
```

昂貴的 Chrome、provider 與完整 staging 驗收集中在 P3、P4、P6、P8。每次改碼仍要跑便宜且高訊號的 focused test、lint 或 typecheck。

## 5. 工作包

### P0：修正文件與環境設定真相

**目的：** 所有後續執行者對 Support 使用同一個正確模型。

**動作：**

1. 在 `.env.example` 恢復 `SUPPORT_RELAY_TARGET_URL`，說明它是下游助理／客服 webhook，不是 Dennis 專屬 URL。
2. 修正 `docs/PRODUCTIZATION_TODO.md` 中所有「relay 非必要、待移除、Support 自己回覆」的敘述。
3. 將舊 TODO 明確標為歷史證據文件，後續順序以本文件為準。
4. 不修改 runtime code、不填入真實 URL 或 secret。

**驗證：** `rg` 檢查所有 Support relay 敘述一致；Markdown UTF-8 正常；`git diff` 只包含文件與範例設定。

**Done When：** 找不到任何要求移除 relay 或依賴 Dennis Bot 的現行指示。提交一個 docs commit。

### P1：建立隔離的 Support Relay Simulator

**目的：** 不依賴 Dennis 的系統，也能驗證完整 relay contract。

**先做最小決策：**

1. 用 CodeGraph／source 確認現有 acceptance helper、部署方式與 public route guard。
2. 比較兩個方案：獨立 staging service；或只在 staging 啟用且具 secret guard 的 acceptance endpoint。
3. 選擇不會在 production 誤開、可部署、可查 receipt、可精確清理的最小方案。
4. 把選擇、風險與停用方式補回本文件後再實作。

**Simulator contract：**

- 接收 KV 轉送的 raw LINE body、`X-Line-Signature`、content type 與 `X-KV-Support-Relay-Key`。
- 可模擬 `200`、timeout、network failure 與 non-2xx。
- 保存有界、可清理的 acceptance receipt；不得保存 channel secret 或 access token。
- 完整模式可取出 `replyToken`，使用 Support channel 回覆唯一測試文字。
- 只有明確 acceptance opt-in、環境限制與 secret guard 全部成立時才能回覆 LINE。
- 測試 marker、收件人 allowlist 與 cleanup 必須精確；不得影響正式使用者。

**Done When：** 本機可穩定模擬四種結果；部署設計有關閉／刪除條件；focused tests 通過。提交 simulator commit。

### P2：完成本機 Support contract 與資料整合

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

**Done When：** 不需要 relay stub 的人工修改即可重跑；Main fixture 清理為 0。提交 Support local acceptance commit。

### P3：Hosted Support LINE 真實流程

**目的：** 證明真實 LINE event 可以經 KV relay 到模擬下游並回覆測試者。

**動作：**

1. 部署 P1～P2 exact commit 到隔離 staging。
2. 同步三個 Support LINE credentials 與 simulator target；不在輸出中顯示值。
3. 用 `/api/version` 確認 commit，用 `/api/health` 確認環境。
4. LINE Console Webhook Verify 必須從 `401` 變成 `200`。
5. 請使用者用 test user／room 傳一則帶唯一 marker 的訊息。
6. 驗證 LINE inbound receipt、KV DB rows、simulator relay receipt 與真實 LINE reply。
7. 用 Chrome 檢查 `/agents/support` 的 loading、成功、活動與對話狀態，UI 外觀不變。
8. 精確清除測試 DB／simulator receipt，確認殘留 0。

**失敗處理：** 在真實 receipt 尚未證明前，不新增 generic retry；先定位是 LINE、KV、DB、relay 還是 simulator owner。

**Done When：** provider receipt、DB diff、Chrome、reply 與 cleanup 五項證據齊全。提交 evidence／必要修正 commit。

### P4：集中完成九月全功能矩陣

每列都需記錄輸入、API、DB、provider、Chrome、cleanup 與失敗 owner；fixture 或 mock 不得冒充 provider receipt。

| 能力 | 必驗收行為 | 真實外部 gate |
|---|---|---|
| Auth／Integrations | login、health、version、provider 狀態與錯誤真相 | hosted exact commit |
| Agent／Chat | 既有 Agent 頁與 OpenAI chat 關鍵操作 | OpenAI 已有 credentials |
| Visit | Primary LINE inbound、名片、研究、邀約、Calendar、Gmail、postback／timeout | 測試 LINE user |
| Orders | normalize、Main persistence、claim／replay、Primary LINE | Teachify 真實 signature 延至 P7 |
| Knowledge Base | crawl、import、review／publish、index、search | Firecrawl／OpenAI 已有 credentials |
| Support／Subscribers／Broadcast | Support relay、subscriber、conversation、broadcast／report | P3 test user／room |
| Meeting | session、turn、realtime／audio、finish、context | OpenAI／Google |
| Goals／Checklist | create、update、history、cleanup | Main staging |
| Reporting／Operations | Teaching read-only、report、hosted cron auth | schedule owner 延至 P8 |
| Live Task／TV／Projection | live／demo 顯示、失敗不冒充空資料 | Chrome staging |

**Done When：** 每列為 Done、Blocked 或 Not required，且 Blocked 有精確外部輸入與安全可繼續工作。提交 acceptance ledger commit。

### P5：只修 P2～P4 暴露的問題

**允許：** provider-specific dedupe、receipt、timeout、partial failure、reconciliation、錯誤顯示、重複 ownership 與證明無價值的 forwarding layer。

**禁止：** 通用 workflow engine、universal retry、每 route 四層、無第二 consumer 的 registry、推測式搬完整 `src/lib`、UI redesign。

每個修正先寫 change contract，確認 entrypoint、owner、caller、side effect、before evidence 與 rollback；只移動這次需求碰到的行為。

**Done When：** 每項修改都能指回一個真實失敗或已核准需求；沒有純命名或檔案數驅動的重構。每個 coherent outcome 一個 commit。

### P6：集中重新驗證

1. 重跑受影響 focused tests、integration、lint、typecheck、build。
2. 部署 exact commit，重跑受影響 provider journey。
3. 用 Chrome 跑真正受影響的頁面與完整後台關鍵矩陣；不得用 `/agents-catalog` 代替。
4. 確認所有 fixture、暫時 settings、allowlist 與 simulator receipt 已還原或清除。
5. 更新本文件的 evidence 與未完成 gate，不新增執行日誌文件。

**Done When：** 修正沒有破壞 UI／API／data contract，且失敗能追到明確 owner。

### P7：關閉 Teachify 外部 gate

**有真實素材時：**

1. 取得官方 signing secret、去識別可重播 event、event ID／timestamp／狀態語意。
2. 驗證 signature -> Orders persistence -> exact replay／concurrency -> Primary LINE -> cleanup。
3. 依真實事件決定 stale／out-of-order 行為；不得由 fingerprint 猜 provider 語意。

**仍無素材時：**

- 產品負責人必須明確選擇延後 Teachify，或核准以「本地 contract 完成、真實 provider 未驗證」交付。
- 此 waiver 必須寫明使用限制、重新開啟條件與 owner；mock 不得標成完成。

**Done When：** 真實 provider 證據完成，或產品 waiver 已核准並反映在 release scope。

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
| Support test user／room | P3 真實 inbound／reply | P0～P2、其他 domain | LINE receipt + DB + simulator + Chrome + cleanup |
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

### Verdict：Needs Revision（完整 release）；P0 Ready

**第一個可執行工作包：** P0。它只修正文件與範例設定，不改 runtime，且現有 source 已提供完整 relay evidence。

**完整 release 尚未 Ready 的原因：**

- P1 simulator 部署形態尚未完成最小選型。
- P3 缺 Support test user／room 的真實 receipt。
- P7 缺 Teachify provider truth或產品 waiver。
- P8 缺 canonical release、backup／restore、schedule failure 與 rollback owner evidence。

這些缺口不阻止 Luna 從 P0 開始，也不阻止 P1～P6 中不依賴相應外部素材的工作。
