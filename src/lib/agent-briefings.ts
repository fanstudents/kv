import type { AgentSlug } from "./types";

// 劇院模式細節卡用：每位 Agent 像真人同事一樣，跟你彙報最近七天、目前重點與產出。
// 介面示範資料（未接後端），數字為示意。

export type OutputKind =
  | "report"
  | "chart"
  | "doc"
  | "mail"
  | "calendar"
  | "post"
  | "message"
  | "alert";

// 劇院式「現正處理」場景：每位 Agent 操作的道具視覺 + 逐步推進的階段
export type PropKind = "card" | "chart" | "chat" | "radar" | "calendar" | "compose" | "doc";

/** 節點的性質：決定畫面上的形狀與圖示（取數是方的、判斷是菱形、AI 有星芒…） */
export type FlowNodeKind = "source" | "process" | "ai" | "decision" | "output" | "store";

/** 旁支：主線之外「順手做掉」的事——寫進知識庫、通報隊友、留一份紀錄。
 * 畫在節點下方，用虛線小支線接回節點，讓人看到主線以外還發生了什麼。 */
export interface FlowSide {
  label: string;
  kind?: FlowNodeKind;
  /** 這個旁支打到的外部服務（有值時顯示品牌 logo） */
  app?: string;
  /** 這個旁支實際上是交給另一位隊友 */
  handoff?: AgentSlug;
}

/** 流程圖節點。每位 Agent 的工作流程是「多欄」構成：一欄一個節點是主幹，一欄多個節點是分支（擇一走）。 */
export interface FlowNode {
  id: string;
  /** 節點名稱 */
  label: string;
  /** 分支條件（顯示在節點上方的小標，例如「要」「先不要」「異常」） */
  branch?: string;
  /** 對應真實 live 進度的鍵：`${step}` 或 `${step}:${status}`（例如 "2:waiting"） */
  live?: string[];
  /** 分支欄中「主幹會繼續走」的那個節點（用來推斷已完成路徑） */
  main?: boolean;
  /** 流程終點（走到這裡代表本次流程結束） */
  terminal?: boolean;
  /** 這一步實際上會跟另一位 Agent 協同（例如約拜訪查行事曆空檔時，讀的是行程助理
   * 也在用的同一份真實 Google 日曆）。畫面上會疊一顆對方的小頭像做視覺連通。 */
  handoff?: AgentSlug;
  /** 這一步實際上是呼叫外部 app（例如 LINE、Google 日曆、Gmail）——有值時節點以真實品牌 logo 呈現，而不是通用圓點 */
  app?: string;
  /** 節點性質（影響形狀與圖示） */
  kind?: FlowNodeKind;
  /** 這一步實際在做什麼（節點下方的一行小字） */
  detail?: string;
  /** 這一步交棒給下一站的資料（標在連線中段，資料流動的封包上） */
  data?: string;
  /** 旁支動作 */
  side?: FlowSide[];
}

export interface FlowColumn {
  /** 階段名稱（畫在這一欄最上方，例如「取數」「判斷」「送出」） */
  title?: string;
  nodes: FlowNode[];
}

export interface AgentLiveDef {
  /** 場景道具（真實任務進行、但沒有實照可放時演出用） */
  prop: PropKind;
  /** 完整工作流程（含分支），展示在細節卡的流程圖 */
  flow: FlowColumn[];
  /** 待命時的狀態標題 */
  idle: string;
  /** 待命時輪播的「正在做的小事」，讓 Agent 看起來活著 */
  ticker: string[];
}

export const AGENT_LIVE_TASKS: Record<AgentSlug, AgentLiveDef> = {
  teamlead: {
    prop: "doc",
    flow: [
      {
        title: "巡場",
        nodes: [
          {
            id: "collect",
            label: "彙整成員動態",
            kind: "source",
            detail: "讀全隊 24h 活動紀錄",
            data: "全隊工作紀錄",
            side: [{ label: "抓漏未回報的隊友", kind: "process" }],
          },
        ],
      },
      {
        title: "體檢",
        nodes: [
          {
            id: "scan",
            label: "掃描異常",
            kind: "process",
            detail: "失敗、逾時、卡關",
            data: "異常清單",
            side: [{ label: "比對昨日基準", kind: "process" }],
          },
        ],
      },
      {
        title: "判斷",
        nodes: [
          { id: "write", label: "撰寫晨報", branch: "正常", main: true, kind: "ai", detail: "AI 寫成一頁摘要" },
          { id: "flag", label: "標記＋通報", branch: "有異常", kind: "decision", detail: "點名負責的隊友跟進" },
        ],
      },
      {
        title: "送出",
        nodes: [
          {
            id: "send",
            label: "寄送 LINE",
            app: "line",
            kind: "output",
            detail: "每早 09:00 準時推播",
            data: "晨報",
          },
        ],
      },
      {
        title: "收尾",
        nodes: [
          {
            id: "archive",
            label: "歸檔追蹤",
            terminal: true,
            kind: "store",
            detail: "未結案的留到明天再問",
            side: [{ label: "待辦寫入待辦總覽", kind: "store" }],
          },
        ],
      },
    ],
    idle: "待命中・下次晨報前整備",
    ticker: ["整理 10 位成員今日進度…", "下一份晨報 明早 09:00 準時送出", "追蹤中事項 3 件，皆在掌握"],
  },
  notify: {
    prop: "chat",
    flow: [
      {
        title: "監測",
        nodes: [
          {
            id: "watch",
            label: "監測指標",
            kind: "source",
            detail: "6 個門檻持續輪詢",
            data: "即時指標值",
          },
        ],
      },
      {
        title: "判斷",
        nodes: [
          {
            id: "judge",
            label: "門檻判斷",
            kind: "decision",
            detail: "比對設定的觸發條件",
            side: [{ label: "門檻微調建議", kind: "process" }],
          },
        ],
      },
      {
        title: "分流",
        nodes: [
          { id: "build", label: "組裝訊息", branch: "觸發", main: true, kind: "process", detail: "帶上數字與建議動作" },
          { id: "loop", label: "繼續監測", branch: "未觸發", terminal: true, kind: "process", detail: "回到監測迴圈" },
        ],
      },
      {
        title: "送出",
        nodes: [
          {
            id: "push",
            label: "推播 LINE",
            app: "line",
            kind: "output",
            detail: "推給該負責的人",
            data: "提醒訊息",
            side: [{ label: "逾時未達自動重送", kind: "process" }],
          },
        ],
      },
      {
        title: "收尾",
        nodes: [
          {
            id: "log",
            label: "記錄回執",
            terminal: true,
            kind: "store",
            detail: "送達與否都留紀錄",
            side: [{ label: "異常回報總管", handoff: "teamlead" }],
          },
        ],
      },
    ],
    idle: "監控中・等待指標觸發",
    ticker: ["盯著 6 個指標門檻…", "LINE 推播通道正常", "上次觸發 今早 09:12"],
  },
  report: {
    prop: "chart",
    flow: [
      {
        title: "取數",
        nodes: [
          {
            id: "ga4",
            label: "GA4 流量",
            branch: "流量",
            app: "google-analytics",
            main: true,
            kind: "source",
            detail: "工作階段 / 轉換 / 渠道",
            data: "28 天流量",
          },
          {
            id: "meta",
            label: "Meta 廣告成效",
            branch: "廣告",
            app: "meta",
            handoff: "today",
            kind: "source",
            detail: "花費 / ROAS / CPA",
          },
          {
            id: "social",
            label: "社群互動數據",
            branch: "社群",
            handoff: "card",
            kind: "source",
            detail: "觸及與互動率",
          },
        ],
      },
      {
        title: "清洗",
        nodes: [
          {
            id: "clean",
            label: "清洗彙整",
            kind: "process",
            detail: "對齊時間軸、去重、補缺",
            data: "統一格式成效表",
            side: [{ label: "缺數據自動補抓", kind: "process" }],
          },
        ],
      },
      {
        title: "脈絡",
        nodes: [
          {
            id: "ctx",
            label: "讀知識庫脈絡",
            app: "supabase",
            kind: "store",
            detail: "去年同期、活動檔期、客群",
            data: "帶脈絡的數據",
          },
        ],
      },
      {
        title: "洞察",
        nodes: [
          {
            id: "insight",
            label: "AI 產生洞察",
            app: "openai",
            kind: "ai",
            detail: "解釋漲跌並給行動建議",
            data: "洞察 + 建議",
            side: [{ label: "洞察存回知識庫", app: "supabase", kind: "store" }],
          },
        ],
      },
      {
        title: "判斷",
        nodes: [
          { id: "produce", label: "產出戰報", branch: "正常", main: true, kind: "output", detail: "一頁式成效戰報" },
          {
            id: "flag",
            label: "標注低谷＋通報",
            branch: "有異常",
            handoff: "teamlead",
            kind: "decision",
            detail: "低於門檻先示警",
          },
        ],
      },
      {
        title: "送出",
        nodes: [
          {
            id: "send",
            label: "推播摘要",
            app: "line",
            terminal: true,
            kind: "output",
            detail: "LINE 推播給指揮官",
            side: [{ label: "歸檔到產出總覽", kind: "store" }],
          },
        ],
      },
    ],
    idle: "待命中・等待數據更新",
    ticker: ["昨日戰報已寄出 ✓", "彙整廣告 / SEO / 社群三路數據…", "下次產出 明早 08:00"],
  },
  schedule: {
    prop: "calendar",
    flow: [
      {
        title: "取行程",
        nodes: [
          {
            id: "read",
            label: "讀取行事曆",
            app: "google-calendar",
            kind: "source",
            detail: "跟約拜訪同一份日曆",
            data: "未來行程",
            handoff: "visit",
          },
        ],
      },
      {
        title: "掃描",
        nodes: [
          {
            id: "scan",
            label: "掃描未來 7 天",
            kind: "process",
            detail: "找衝突、交期與續約日",
            data: "重點時段",
            side: [{ label: "空檔給約拜訪用", handoff: "visit" }],
          },
        ],
      },
      {
        title: "判斷",
        nodes: [
          { id: "remind", label: "產生提醒", branch: "正常", main: true, kind: "process", detail: "會議前 30 分鐘提醒" },
          { id: "resolve", label: "擬改期選項", branch: "衝突", kind: "decision", detail: "備兩個替代時段" },
        ],
      },
      {
        title: "送出",
        nodes: [
          {
            id: "send",
            label: "發送 LINE",
            app: "line",
            kind: "output",
            detail: "同時通知雙方",
            data: "提醒 / 改期選項",
          },
        ],
      },
      {
        title: "收尾",
        nodes: [
          {
            id: "confirm",
            label: "確認回覆",
            terminal: true,
            kind: "store",
            detail: "回覆後寫回行事曆",
            side: [{ label: "更新日曆事件", app: "google-calendar", kind: "store" }],
          },
        ],
      },
    ],
    idle: "待命中・盯著未來七天",
    ticker: ["掃描未來 7 天行程…", "距離下次提醒 42 分", "目前沒有時段衝突"],
  },
  card: {
    prop: "compose",
    flow: [
      {
        title: "聽風向",
        nodes: [
          {
            id: "listen",
            label: "讀口碑風向",
            branch: "情緒參考",
            handoff: "competitor",
            kind: "source",
            detail: "這週大家在討論什麼",
            data: "情緒與熱詞",
            side: [{ label: "SEO 熱門選題", handoff: "expense" }],
          },
        ],
      },
      {
        title: "選題",
        nodes: [
          {
            id: "ideate",
            label: "選題發想",
            kind: "process",
            detail: "對照品牌調性挑角度",
            data: "本週題目",
          },
        ],
      },
      {
        title: "草稿",
        nodes: [
          {
            id: "draft",
            label: "AI 多版草稿",
            app: "openai",
            kind: "ai",
            detail: "一題三個語氣版本",
            data: "3 版圖文",
            side: [{ label: "圖片素材生成", kind: "ai" }],
          },
        ],
      },
      {
        title: "定案",
        nodes: [
          { id: "auto", label: "自動排程", branch: "定稿", main: true, kind: "process", detail: "排進最佳發文時段" },
          { id: "pick", label: "等你挑版本", branch: "多版草稿", kind: "decision", detail: "LINE 上挑一版" },
        ],
      },
      {
        title: "發佈",
        nodes: [
          {
            id: "publish",
            label: "多平台發佈",
            app: "meta",
            kind: "output",
            detail: "IG / FB / Threads 同步",
            data: "上線貼文",
          },
        ],
      },
      {
        title: "後續",
        nodes: [
          {
            id: "reply",
            label: "回覆留言",
            branch: "一般",
            main: true,
            terminal: true,
            kind: "process",
            detail: "常見問題直接回",
            side: [{ label: "互動數據給數據參謀", handoff: "report" }],
          },
          {
            id: "boost",
            label: "爆文轉廣告素材",
            branch: "高互動",
            handoff: "today",
            terminal: true,
            kind: "decision",
            detail: "互動率前段直接投放",
          },
        ],
      },
    ],
    idle: "待命中・等待排程時間",
    ticker: ["3 版草稿等你挑選", "下次發文 明日 12:00", "參考口碑情緒調整語氣"],
  },
  expense: {
    prop: "radar",
    flow: [
      {
        title: "取數",
        nodes: [
          {
            id: "crawl",
            label: "爬取排名",
            app: "google-search-console",
            kind: "source",
            detail: "點擊 / 曝光 / 平均排名",
            data: "關鍵字快照",
          },
        ],
      },
      {
        title: "比對",
        nodes: [
          {
            id: "diff",
            label: "對比變化",
            kind: "process",
            detail: "跟上週、去年同期比",
            data: "漲跌清單",
            side: [{ label: "技術面健檢", kind: "process" }],
          },
        ],
      },
      {
        title: "判斷",
        nodes: [
          {
            id: "opportunity",
            label: "整理機會清單",
            branch: "排名上升",
            main: true,
            kind: "decision",
            detail: "第 11-20 名優先補內容",
          },
          { id: "fix", label: "擬技術修正建議", branch: "排名下滑", kind: "decision", detail: "速度、結構化資料" },
        ],
      },
      {
        title: "內容",
        nodes: [
          {
            id: "draft",
            label: "AI 產內容草稿",
            app: "openai",
            kind: "ai",
            detail: "比較型長文為主",
            data: "文章草稿",
          },
        ],
      },
      {
        title: "分流",
        nodes: [
          {
            id: "topics",
            label: "選題入庫",
            branch: "定稿",
            app: "supabase",
            main: true,
            kind: "store",
            detail: "存進知識庫供全隊用",
          },
          {
            id: "toCard",
            label: "熱門選題給社群",
            branch: "可再利用",
            handoff: "card",
            kind: "decision",
            detail: "同一題改寫成貼文",
          },
        ],
      },
      {
        title: "彙整",
        nodes: [
          {
            id: "weekly",
            label: "週報＋彙整",
            handoff: "report",
            terminal: true,
            kind: "output",
            detail: "自然流量進數據參謀的戰報",
            side: [{ label: "排名警示推播", app: "line", kind: "output" }],
          },
        ],
      },
    ],
    idle: "監看中・持續追蹤排名",
    ticker: ["排名快照 每日 06:00", "3 組關鍵字進前十 ▲", "熱門選題已同步社群"],
  },
  visit: {
    prop: "card",
    flow: [
      {
        title: "辨識",
        nodes: [
          {
            id: "scan",
            label: "辨識名片",
            live: ["0"],
            kind: "source",
            detail: "AI 讀出姓名、公司、職稱",
            data: "名片欄位",
          },
        ],
      },
      {
        title: "建檔",
        nodes: [
          {
            id: "write",
            label: "寫入聯絡人",
            live: ["1"],
            kind: "store",
            detail: "存進聯絡人資料庫",
            data: "聯絡人",
            side: [{ label: "同名重複自動合併", kind: "process" }],
          },
        ],
      },
      {
        title: "確認",
        nodes: [
          {
            id: "confirm",
            label: "確認資訊（可修正）",
            live: ["2:waiting"],
            kind: "decision",
            detail: "LINE 上跟你核對一次",
          },
        ],
      },
      {
        title: "分流",
        nodes: [
          {
            id: "match",
            label: "比對行事曆空檔",
            branch: "要",
            live: ["2:active"],
            main: true,
            handoff: "schedule",
            app: "google-calendar",
            kind: "process",
            detail: "跟行程助理同一份日曆",
          },
          {
            id: "tag",
            label: "標註客戶標籤",
            branch: "先不要",
            live: ["2:done"],
            terminal: true,
            kind: "store",
            detail: "留著之後再跟進",
          },
        ],
      },
      {
        title: "邀約",
        nodes: [
          {
            id: "draft",
            label: "草擬邀約信",
            live: ["3"],
            kind: "ai",
            detail: "帶上兩個候選時段",
            data: "邀約信",
          },
        ],
      },
      {
        title: "送出",
        nodes: [
          {
            id: "sent",
            label: "寄出＆追蹤回覆",
            live: ["4"],
            terminal: true,
            app: "gmail",
            kind: "output",
            detail: "沒回信自動排跟進",
            side: [{ label: "確認後建立日曆事件", app: "google-calendar", handoff: "schedule" }],
          },
        ],
      },
    ],
    idle: "待命中・等待名片上傳",
    ticker: ["名片一傳來就開工", "2 位客戶回覆較慢，已排跟進", "邀約信模板已就緒"],
  },
  today: {
    prop: "chart",
    flow: [
      {
        title: "取數",
        nodes: [
          {
            id: "meta",
            label: "Meta 成效",
            branch: "Meta",
            app: "meta",
            main: true,
            kind: "source",
            detail: "活動 / 組合 / 素材三層",
            data: "投放成效",
          },
          {
            id: "google",
            label: "Google Ads",
            branch: "Google",
            app: "google-analytics",
            kind: "source",
            detail: "搜尋與多媒體",
          },
        ],
      },
      {
        title: "算帳",
        nodes: [
          {
            id: "calc",
            label: "計算 CPA / ROAS",
            kind: "process",
            detail: "換算成同一把尺",
            data: "成本效益表",
            side: [{ label: "素材疲勞度檢查", kind: "process" }],
          },
        ],
      },
      {
        title: "受眾",
        nodes: [
          {
            id: "audience",
            label: "受眾比對",
            branch: "排除競品受眾",
            handoff: "competitor",
            kind: "process",
            detail: "負評受眾先排除",
            data: "受眾調整建議",
            side: [{ label: "高互動貼文轉素材", handoff: "card" }],
          },
        ],
      },
      {
        title: "判斷",
        nodes: [
          { id: "scale", label: "標記加碼機會", branch: "達標", main: true, kind: "decision", detail: "ROAS 前段建議加預算" },
          { id: "alert", label: "即時警示", branch: "超標", app: "line", kind: "output", detail: "CPA 超標當下就通知" },
        ],
      },
      {
        title: "彙整",
        nodes: [
          {
            id: "daily",
            label: "日報＋彙整",
            handoff: "report",
            terminal: true,
            kind: "output",
            detail: "廣告成效進戰報",
          },
        ],
      },
    ],
    idle: "待命中・等待投放數據",
    ticker: ["下次抓取 明早 06:30", "跨 Meta / Google 門檻監控中…", "加碼機會清單 12 筆"],
  },
  competitor: {
    prop: "radar",
    flow: [
      {
        title: "監看",
        nodes: [
          {
            id: "watch",
            label: "監看 IG／Threads／PTT／FB",
            kind: "source",
            detail: "品牌字與競品字一起掃",
            data: "原始聲量",
          },
        ],
      },
      {
        title: "分級",
        nodes: [
          {
            id: "score",
            label: "AI 情緒分級",
            app: "openai",
            kind: "ai",
            detail: "每則打 0-100 情緒分",
            data: "情緒分數",
            side: [{ label: "情緒關鍵詞統計", kind: "process" }],
          },
        ],
      },
      {
        title: "判斷",
        nodes: [
          { id: "digest", label: "納入彙整", branch: "正面／中立", main: true, kind: "process", detail: "累積成聲量趨勢" },
          {
            id: "escalate",
            label: "即時通報＋建議回覆",
            branch: "負評",
            app: "line",
            kind: "output",
            detail: "附一版可直接貼的回覆",
          },
        ],
      },
      {
        title: "入庫",
        nodes: [
          {
            id: "intel",
            label: "競品敵情入庫",
            app: "supabase",
            kind: "store",
            detail: "競品活動與定價變化",
            data: "敵情摘要",
          },
        ],
      },
      {
        title: "外送",
        nodes: [
          {
            id: "toCard",
            label: "情緒風向給社群",
            branch: "內容調整",
            handoff: "card",
            main: true,
            terminal: true,
            kind: "output",
            detail: "調整貼文題材與語氣",
          },
          {
            id: "toAds",
            label: "受眾建議給廣告",
            branch: "投放調整",
            handoff: "today",
            terminal: true,
            kind: "output",
            detail: "排除或加碼特定受眾",
          },
        ],
      },
    ],
    idle: "監看中・盯著評論與競品",
    ticker: ["掃描 IG / Threads / PTT / FB…", "競品情緒對比監看中", "本週綜合情緒 78°"],
  },
  operations: {
    prop: "doc",
    flow: [
      {
        title: "盤點",
        nodes: [
          {
            id: "audit",
            label: "盤點各線數據",
            kind: "source",
            detail: "內訓 / 公開課 / 導入 / 陪跑",
            data: "各產品線現況",
          },
        ],
      },
      {
        title: "彙整",
        nodes: [
          {
            id: "dashboard",
            label: "更新儀表板",
            kind: "process",
            detail: "進度、金額、下一步",
            data: "營運全貌",
            side: [{ label: "訂單營收對帳", handoff: "orders" }],
          },
        ],
      },
      {
        title: "判斷",
        nodes: [
          {
            id: "kb",
            label: "更新知識庫",
            branch: "正常",
            main: true,
            app: "supabase",
            kind: "store",
            detail: "補常見問答與 SOP",
            side: [{ label: "網址匯入抓正文", app: "firecrawl", kind: "source" }],
          },
          { id: "blocker", label: "標記卡點待辦", branch: "卡點", kind: "decision", detail: "指派負責人與期限" },
        ],
      },
      {
        title: "同步",
        nodes: [
          {
            id: "sync",
            label: "同步團隊",
            kind: "output",
            detail: "把異動推給相關隊友",
            data: "異動通知",
            side: [{ label: "重大異動回報總管", handoff: "teamlead" }],
          },
        ],
      },
      {
        title: "收尾",
        nodes: [{ id: "archive", label: "歸檔", terminal: true, kind: "store", detail: "留一份可回溯的快照" }],
      },
    ],
    idle: "待命中・等待營運異動",
    ticker: ["儀表板已同步 ✓", "知識庫本週 +6 條", "1 個流程卡點待處理"],
  },
  support: {
    prop: "chat",
    flow: [
      {
        title: "進線",
        nodes: [
          {
            id: "receive",
            label: "接收進線",
            app: "line",
            kind: "source",
            detail: "客服官方帳號 24h 值班",
            data: "客戶訊息",
          },
        ],
      },
      {
        title: "理解",
        nodes: [
          {
            id: "understand",
            label: "理解意圖",
            kind: "ai",
            detail: "分類問題並找出關鍵字",
            data: "意圖分類",
            side: [{ label: "查知識庫話術", app: "supabase", kind: "store" }],
          },
        ],
      },
      {
        title: "判斷",
        nodes: [
          { id: "script", label: "話術回覆", branch: "常見題", main: true, kind: "process", detail: "照核可過的話術回" },
          { id: "human", label: "轉真人＋附摘要", branch: "複雜題", kind: "decision", detail: "把前情摘要一起交接" },
        ],
      },
      {
        title: "回覆",
        nodes: [
          {
            id: "send",
            label: "送出回覆",
            app: "line",
            kind: "output",
            detail: "平均 3 分鐘內回覆",
            data: "回覆訊息",
          },
        ],
      },
      {
        title: "收尾",
        nodes: [
          {
            id: "log",
            label: "記錄對話",
            terminal: true,
            kind: "store",
            detail: "整段對話留檔可查",
            side: [{ label: "負面情緒轉口碑追蹤", handoff: "competitor" }],
          },
        ],
      },
    ],
    idle: "整備中・等待帳號金鑰",
    ticker: ["等待 Channel 金鑰接入…", "客服話術庫已就緒", "隨時可以上線值班"],
  },
  orders: {
    prop: "doc",
    flow: [
      {
        title: "接單",
        nodes: [
          {
            id: "receive",
            label: "接收新訂單",
            kind: "source",
            detail: "Teachify Webhook 即時進來",
            data: "訂單內容",
          },
        ],
      },
      {
        title: "核對",
        nodes: [
          {
            id: "verify",
            label: "核對付款",
            kind: "process",
            detail: "金額、品項、發票資訊",
            data: "已核對訂單",
            side: [{ label: "營收累加到營運儀表板", handoff: "operations" }],
          },
        ],
      },
      {
        title: "判斷",
        nodes: [
          { id: "ship", label: "通知出貨", branch: "正常", main: true, app: "line", kind: "output", detail: "推播明細給你" },
          { id: "escalate", label: "通報異常給你", branch: "異常", kind: "decision", detail: "退款、金額對不上" },
        ],
      },
      {
        title: "追蹤",
        nodes: [
          {
            id: "track",
            label: "追蹤到貨",
            kind: "process",
            detail: "盯物流與取貨狀態",
            data: "配送狀態",
          },
        ],
      },
      {
        title: "收尾",
        nodes: [
          { id: "done", label: "完成歸檔", branch: "已取貨", main: true, terminal: true, kind: "store", detail: "併入營收統計" },
          {
            id: "overdue",
            label: "逾期提醒取貨",
            branch: "逾期",
            terminal: true,
            app: "line",
            kind: "output",
            detail: "超過期限自動催取",
          },
        ],
      },
    ],
    idle: "整備中・等待 Webhook",
    ticker: ["等待 Teachify Webhook 接通…", "出貨／到貨通知模板就緒", "逾期未取追蹤已設定"],
  },
};

export interface AgentBriefing {
  /** 第一人稱開場（會與 report 一起打字呈現） */
  greeting: string;
  /** 最近七天彙報（第一人稱，像真人跟你報告） */
  report: string;
  /** 最近七天關鍵數字 */
  weekStats: { label: string; value: string; delta?: string }[];
  /** 目前任務重點 */
  focus: string[];
  /** 最近的產出 */
  outputs: { kind: OutputKind; label: string; meta: string }[];
}

export const AGENT_BRIEFINGS: Record<AgentSlug, AgentBriefing> = {
  teamlead: {
    greeting: "嗨，我是 Vivian，團隊大總管。",
    report:
      "這七天我幫你盯著整個團隊——共完成 168 項任務、攔下 3 件異常，每天早上 9 點的晨報都準時送到。這週最值得注意的是深夜客服量成長，我已經請客服和訂單多留意深夜時段。",
    weekStats: [
      { label: "團隊完成任務", value: "168" },
      { label: "攔下異常", value: "3" },
      { label: "準時晨報", value: "7/7" },
    ],
    focus: ["每日彙整團隊摘要與異常", "督導深夜時段人力調度", "追蹤上週待辦的收尾"],
    outputs: [
      { kind: "report", label: "每日團隊晨報 ×7", meta: "最近一份 今早 09:00" },
      { kind: "alert", label: "異常匯報 ×3", meta: "廣告 CPA、推播逾時、庫存" },
      { kind: "doc", label: "週會摘要", meta: "昨日 18:00" },
    ],
  },
  notify: {
    greeting: "我是 Kevin，即時監控。",
    report:
      "這週我觸發了 42 則即時提醒，平均 3.2 分鐘內送達，一則都沒漏。有一次 LINE API 逾時，我立刻重送並記錄；問卷完成率掉到 65% 時，我第一時間通知了行銷群組。",
    weekStats: [
      { label: "觸發提醒", value: "42" },
      { label: "平均回應", value: "3.2 分" },
      { label: "漏發", value: "0" },
    ],
    focus: ["監控關鍵指標門檻", "盯付款逾時與問卷完成率", "確保推播不漏發"],
    outputs: [
      { kind: "alert", label: "即時提醒 ×42", meta: "最近 09:12" },
      { kind: "message", label: "行銷群組通知", meta: "問卷完成率低於 65%" },
      { kind: "alert", label: "付款逾時提醒 ×5", meta: "本週" },
    ],
  },
  report: {
    greeting: "我是 Ivy，成效分析。",
    report:
      "過去七天我每天整理流量、轉換與 ROAS，做成一頁報表。這週整體 ROAS 3.4、比上週好一點；週三轉換率有個小低谷，我在報表裡標了原因。今日成效摘要剛剛產好。",
    weekStats: [
      { label: "週 ROAS", value: "3.4", delta: "+0.3" },
      { label: "產出報表", value: "7" },
      { label: "洞察建議", value: "12" },
    ],
    focus: ["每日成效彙整與洞察", "找出轉換低谷原因", "標記值得加碼的渠道"],
    outputs: [
      { kind: "chart", label: "今日成效報表", meta: "剛剛產出" },
      { kind: "report", label: "週成效摘要", meta: "含 ROAS 趨勢" },
      { kind: "doc", label: "渠道洞察 ×12", meta: "本週" },
    ],
  },
  schedule: {
    greeting: "我是 Milo，行程助理。",
    report:
      "這週我幫你顧好行程，發出 9 則會議提醒、處理 2 次改期，沒有錯過任何一場。7/18 王小明的諮詢已確認；偵測到一次時段衝突，我先擬好兩個改期選項給你挑。",
    weekStats: [
      { label: "會議提醒", value: "9" },
      { label: "處理改期", value: "2" },
      { label: "錯過", value: "0" },
    ],
    focus: ["盯交期與續約日", "會議前 30 分鐘提醒", "偵測並排解行程衝突"],
    outputs: [
      { kind: "calendar", label: "會議提醒 ×9", meta: "最近 明早 09:00" },
      { kind: "message", label: "預約確認", meta: "王小明 7/18 14:00" },
      { kind: "doc", label: "改期建議 ×2", meta: "含替代時段" },
    ],
  },
  card: {
    greeting: "嗨，我是 Sunny，社群操盤手。",
    report:
      "這七天我發了 6 篇貼文、回了 88 則留言，整理出本週社群成效。週二那篇互動率 6.2% 最高，我建議下週多做同類型題材。明日貼文的 3 版草稿已經備好等你挑。",
    weekStats: [
      { label: "發文", value: "6" },
      { label: "回留言", value: "88" },
      { label: "最高互動率", value: "6.2%" },
    ],
    focus: ["排程發文與即時回留言", "放大高互動題材", "整理每週社群成效"],
    outputs: [
      { kind: "post", label: "貼文 ×6", meta: "最近 今日 12:00" },
      { kind: "doc", label: "明日貼文草稿 ×3", meta: "待挑選" },
      { kind: "chart", label: "週社群成效", meta: "含互動率" },
    ],
  },
  expense: {
    greeting: "我是 Leo，SEO 優化。",
    report:
      "這週我追蹤關鍵字排名、產出 2 篇內容草稿。有 3 組關鍵字進到前十，我把最有機會的比較型關鍵字整理成下週選題。技術面健檢也做完了，沒有大問題。",
    weekStats: [
      { label: "進前十關鍵字", value: "3" },
      { label: "內容草稿", value: "2" },
      { label: "健檢問題", value: "0" },
    ],
    focus: ["追蹤關鍵字排名", "量產比較型內容", "定期技術面健檢"],
    outputs: [
      { kind: "report", label: "排名週報", meta: "3 組進前十" },
      { kind: "doc", label: "內容草稿 ×2", meta: "待審" },
      { kind: "chart", label: "關鍵字機會清單", meta: "本週" },
    ],
  },
  visit: {
    greeting: "我是 Coco，商務邀約。",
    report:
      "這週我幫你約了 5 場拜訪、來回喬時間 14 次。有 2 位客戶回覆較慢，我已排定跟進提醒。所有邀約信與時段確認信都寄出了，前一天也會自動提醒雙方。",
    weekStats: [
      { label: "成約拜訪", value: "5" },
      { label: "喬時間", value: "14" },
      { label: "待跟進", value: "2" },
    ],
    focus: ["發拜訪邀約與時段確認", "來回協調雙方空檔", "前一天提醒不漏約"],
    outputs: [
      { kind: "mail", label: "邀約信 ×5", meta: "本週寄出" },
      { kind: "calendar", label: "拜訪行程 ×5", meta: "已建立" },
      { kind: "message", label: "跟進提醒 ×2", meta: "回覆較慢客戶" },
    ],
  },
  today: {
    greeting: "嗨，我是 Dana，廣告投手。",
    report:
      "這七天我每天抓 Meta 與 Google 的投放成效。整體 ROAS 3.1，週四 CPA 一度高於門檻 20%，我當下就通知並建議排除疲勞受眾。這週花費 NT$86,400，我也標好了 12 筆值得加碼的機會。",
    weekStats: [
      { label: "週 ROAS", value: "3.1" },
      { label: "廣告花費", value: "86.4K" },
      { label: "超標提醒", value: "1" },
    ],
    focus: ["每日抓取投放成效", "盯 CPA / ROAS 門檻", "找出值得加碼的組合"],
    outputs: [
      { kind: "chart", label: "每日廣告成效 ×7", meta: "最近 今早" },
      { kind: "alert", label: "CPA 超標提醒", meta: "週四 +20%" },
      { kind: "report", label: "加碼機會清單", meta: "12 筆" },
    ],
  },
  competitor: {
    greeting: "我是 Jay，口碑聲量。",
    report:
      "這週我盯著社群與評論區，抓到 2 則新的 Google 評論、1 則負評第一時間通知你。競品這週上了一檔新活動，我整理成敵情摘要。整體品牌聲量比上週上升 8%。",
    weekStats: [
      { label: "新評論", value: "2" },
      { label: "負評攔截", value: "1" },
      { label: "聲量變化", value: "+8%" },
    ],
    focus: ["監看評論與社群聲量", "負評第一時間通報", "追蹤競品動態"],
    outputs: [
      { kind: "alert", label: "負評通知", meta: "已附建議回覆" },
      { kind: "report", label: "競品敵情摘要", meta: "本週活動" },
      { kind: "chart", label: "聲量週報", meta: "+8%" },
    ],
  },
  operations: {
    greeting: "我是 Morgan，營運總管。",
    report:
      "這週我把各產品線現況更新進營運儀表板，補了 6 條知識庫問答。有一個流程卡點我標記出來給你，建議這週處理。整體庫存與出貨都正常，沒有異常。",
    weekStats: [
      { label: "知識庫更新", value: "6" },
      { label: "流程卡點", value: "1" },
      { label: "異常", value: "0" },
    ],
    focus: ["維護營運儀表板", "擴充知識庫", "盤點流程卡點"],
    outputs: [
      { kind: "doc", label: "知識庫更新 ×6", meta: "本週" },
      { kind: "chart", label: "營運儀表板", meta: "各產品線現況" },
      { kind: "alert", label: "流程卡點標記", meta: "待處理 ×1" },
    ],
  },
  support: {
    greeting: "嗨，我是 Amber，客服接待。",
    report:
      "我正在等第二支客服官方帳號的 Channel 金鑰接上，一接好就能 24 小時待命回覆進線。這七天我先把常見問題與回覆話術整理好了，上線就能直接用。",
    weekStats: [
      { label: "話術準備", value: "就緒" },
      { label: "待接帳號", value: "1" },
    ],
    focus: ["等待客服官方帳號金鑰", "整理常見問題話術", "準備上線值班"],
    outputs: [{ kind: "doc", label: "客服話術庫", meta: "已就緒" }],
  },
  orders: {
    greeting: "我是 Ray，訂單值班。",
    report:
      "我正在等 Teachify 訂單 Webhook 設定完成，接上後新訂單一進來，我就通知出貨、追到貨與逾期未取。這七天我先把各種通知模板都備好了。",
    weekStats: [
      { label: "通知模板", value: "就緒" },
      { label: "待接 Webhook", value: "1" },
    ],
    focus: ["等待 Teachify Webhook", "準備出貨／到貨通知", "設定逾期未取追蹤"],
    outputs: [{ kind: "doc", label: "訂單通知模板", meta: "已就緒" }],
  },
};
