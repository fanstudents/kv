export interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
}

export const CHECKLIST: ChecklistItem[] = [
  // 部署上線
  {
    id: "deploy-zeabur-bound",
    category: "部署上線",
    title: "確認 Zeabur 服務已連接 GitHub repo",
    description: "kva.zeabur.app 曾回應平台層級 404，代表該網域底下還沒有服務在跑，需要到 Zeabur 後台確認連接與網域綁定。",
    severity: "high",
  },
  {
    id: "deploy-env-vars",
    category: "部署上線",
    title: "在 Zeabur 設定環境變數",
    description: "共 6 組：LINE_CHANNEL_ID、LINE_CHANNEL_SECRET、LINE_CHANNEL_ACCESS_TOKEN、SUPABASE_URL、SUPABASE_ANON_KEY、OPENAI_API_KEY。",
    severity: "high",
  },
  {
    id: "deploy-line-webhook",
    category: "部署上線",
    title: "在 LINE Developers Console 設定並驗證 Webhook URL",
    description: "部署成功後，將 Webhook URL 設為 https://你的網域/api/line/webhook，並點擊「Verify」確認回應 200。",
    severity: "medium",
  },
  {
    id: "deploy-line-webhook-toggle",
    category: "部署上線",
    title: "在 LINE Developers Console 開啟「Use webhook」開關",
    description: "驗證成功後記得手動開啟，否則 LINE 不會把訊息轉發到你的 Webhook。",
    severity: "medium",
  },

  // 安全性
  {
    id: "security-rotate-line",
    category: "安全性",
    title: "輪換 LINE Channel Secret 與 Access Token",
    description: "這兩組憑證曾在對話中以明文提供，建議到 LINE Developers Console 重新產生。",
    severity: "high",
  },
  {
    id: "security-rotate-openai",
    category: "安全性",
    title: "輪換 OpenAI API Key",
    description: "同樣曾在對話中以明文提供，建議到 OpenAI 後台重新產生。",
    severity: "high",
  },
  {
    id: "security-auth",
    category: "安全性",
    title: "後台目前沒有登入驗證機制",
    description: "任何知道網址的人都能檢視、修改所有 Agent 設定。若之後要對外或多人使用，需要加上登入機制。",
    severity: "medium",
  },
  {
    id: "security-rls",
    category: "安全性",
    title: "Supabase RLS 政策目前完全開放",
    description: "line_agents／line_agent_activity／checklist_status 三張表目前允許任何持有 anon key 的請求讀寫，之後有真正驗證機制時應收緊。",
    severity: "low",
  },

  // 各 Agent 待接真實資料源
  {
    id: "agent-notify-source",
    category: "Agent 真實資料源",
    title: "Kevin 通知：串接真實指標資料來源",
    description: "目前的觸發條件（如問卷完成率）僅為示範，尚未接上真實的資料系統。",
    severity: "medium",
  },
  {
    id: "agent-report-source",
    category: "Agent 真實資料源",
    title: "Ivy 報表：串接真實報表數據來源",
    description: "報表中的數字目前是範例值，尚未接上真實的資料系統。",
    severity: "medium",
  },
  {
    id: "agent-calendar-oauth",
    category: "Agent 真實資料源",
    title: "Milo 行程 / Coco 約拜訪：串接 Google Calendar",
    description: "需要 Google OAuth 憑證才能讀取真實空檔，目前顯示的時段是依設定計算出的示範值。",
    severity: "medium",
  },
  {
    id: "agent-card-ocr",
    category: "Agent 真實資料源",
    title: "Sunny 名片：串接名片 OCR",
    description: "目前只有約拜訪 Agent（Coco）接了 OpenAI OCR，名片 Agent 本身尚未串接。",
    severity: "medium",
  },
  {
    id: "agent-expense",
    category: "Agent 真實資料源",
    title: "Leo 報帳：尚未開發任何真實邏輯",
    description: "目前只有介面，發票辨識與歸檔完全尚未串接。",
    severity: "low",
  },
  {
    id: "agent-visit-email-send",
    category: "Agent 真實資料源",
    title: "Coco 約拜訪：串接 Email 寄送服務",
    description: "目前只會產生邀約信「預覽」，不會真的寄出，需要 Gmail API 或其他寄信服務（如 Resend）。",
    severity: "medium",
  },
  {
    id: "agent-today-gmail",
    category: "Agent 真實資料源",
    title: "Dana 今日完成：串接 Gmail API + LINE 訊息紀錄",
    description: "需要 Google OAuth 讀取兩個 Gmail 信箱，以及讀取「數位簡報室」LINE 官方帳號訊息紀錄的方式。",
    severity: "medium",
  },
  {
    id: "agent-competitor-source",
    category: "Agent 真實資料源",
    title: "Jay 競爭對手：串接新聞／搜尋資料來源",
    description: "目前情報清單為示範資料，需要新聞 RSS 或搜尋 API 才能真正監控對手動態。",
    severity: "medium",
  },
];
