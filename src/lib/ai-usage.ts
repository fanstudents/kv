import "server-only";
import { getMainSupabase } from "@/lib/supabase";

// OpenAI 各模型定價（美元／每百萬 token），僅供成本估算，會依 OpenAI 官方調整。
// input = prompt tokens，output = completion tokens。
const PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4.1": { input: 2, output: 8 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
};

export interface OpenAIUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export function estimateCost(model: string, usage: OpenAIUsage): number {
  const price = PRICING[model];
  if (!price) return 0;
  const input = (usage.prompt_tokens ?? 0) / 1_000_000;
  const output = (usage.completion_tokens ?? 0) / 1_000_000;
  return input * price.input + output * price.output;
}

// ── 成本護欄 ──────────────────────────────────────────────
// ai_usage_logs 一直只是「記帳本」——記得很清楚，但不會阻止任何事。
// 一個迴圈 bug、一份 300 頁的 PDF、或有人狂點重建索引，就是一張帳單。
// 這裡加一道閘門：超過每日／每月預算就直接拒絕後續呼叫。
//
// 預算從環境變數讀（沒設定就用保守的預設值）：
//   AI_DAILY_BUDGET_USD   預設 5
//   AI_MONTHLY_BUDGET_USD 預設 60
// 查詢結果快取 60 秒——這是護欄不是計費系統，不需要每次呼叫都精確到分。

export class BudgetExceededError extends Error {
  constructor(
    message: string,
    readonly scope: "daily" | "monthly",
    readonly spent: number,
    readonly limit: number
  ) {
    super(message);
    this.name = "BudgetExceededError";
  }
}

const BUDGET_CACHE_MS = 60_000;
let budgetCache: { at: number; daily: number; monthly: number } | null = null;

async function spentSoFar(): Promise<{ daily: number; monthly: number }> {
  if (budgetCache && Date.now() - budgetCache.at < BUDGET_CACHE_MS) {
    return { daily: budgetCache.daily, monthly: budgetCache.monthly };
  }
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data } = await getMainSupabase()
    .from("ai_usage_logs")
    .select("cost_usd,created_at")
    .gte("created_at", monthStart);

  let daily = 0;
  let monthly = 0;
  for (const row of data ?? []) {
    const cost = Number(row.cost_usd) || 0;
    monthly += cost;
    if (row.created_at >= dayStart) daily += cost;
  }
  budgetCache = { at: Date.now(), daily, monthly };
  return { daily, monthly };
}

export interface BudgetStatus {
  daily: { spent: number; limit: number };
  monthly: { spent: number; limit: number };
}

export function budgetLimits(): { daily: number; monthly: number } {
  return {
    daily: Number(process.env.AI_DAILY_BUDGET_USD) || 5,
    monthly: Number(process.env.AI_MONTHLY_BUDGET_USD) || 60,
  };
}

export async function budgetStatus(): Promise<BudgetStatus> {
  const limits = budgetLimits();
  const spent = await spentSoFar();
  return {
    daily: { spent: spent.daily, limit: limits.daily },
    monthly: { spent: spent.monthly, limit: limits.monthly },
  };
}

/** 呼叫 AI 之前先過這道閘門；超支就丟 BudgetExceededError，不會真的送出請求。 */
export async function assertBudget(operation: string): Promise<void> {
  try {
    const limits = budgetLimits();
    const spent = await spentSoFar();
    if (spent.daily >= limits.daily) {
      throw new BudgetExceededError(
        `今日 AI 用量已達上限（US$${spent.daily.toFixed(2)} / ${limits.daily}）——「${operation}」已停止。明天會自動恢復，或調高 AI_DAILY_BUDGET_USD。`,
        "daily",
        spent.daily,
        limits.daily
      );
    }
    if (spent.monthly >= limits.monthly) {
      throw new BudgetExceededError(
        `本月 AI 用量已達上限（US$${spent.monthly.toFixed(2)} / ${limits.monthly}）——「${operation}」已停止。`,
        "monthly",
        spent.monthly,
        limits.monthly
      );
    }
  } catch (err) {
    if (err instanceof BudgetExceededError) throw err;
    // 查不到用量就放行：護欄壞掉不該讓整個系統停擺
  }
}

/** 記錄之後讓快取失效，下一次檢查才看得到剛剛的花費 */
function invalidateBudgetCache() {
  budgetCache = null;
}

// 記錄一次 AI 呼叫的用量與估算成本。失敗不影響主流程（吞掉錯誤）。
export async function logAiUsage(params: {
  operation: string;
  model: string;
  usage: OpenAIUsage | undefined;
  agentSlug?: string | null;
}) {
  try {
    const usage = params.usage ?? {};
    const cost = estimateCost(params.model, usage);
    await getMainSupabase()
      .from("ai_usage_logs")
      .insert({
        agent_slug: params.agentSlug ?? null,
        operation: params.operation,
        model: params.model,
        prompt_tokens: usage.prompt_tokens ?? 0,
        completion_tokens: usage.completion_tokens ?? 0,
        total_tokens: usage.total_tokens ?? (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0),
        cost_usd: cost,
      });
    invalidateBudgetCache();
  } catch {
    // 記錄失敗不影響主流程
  }
}

// Realtime 語音模型定價（美元／每百萬 token）：文字與語音分開計價，語音貴很多，
// 用單一費率算會嚴重低估——這也是之前完全沒記錄 Realtime 成本的原因之一。
const REALTIME_PRICING: Record<
  string,
  { text: { in: number; cachedIn: number; out: number }; audio: { in: number; cachedIn: number; out: number } }
> = {
  "gpt-realtime-2.1": {
    text: { in: 4, cachedIn: 0.4, out: 24 },
    audio: { in: 32, cachedIn: 0.4, out: 64 },
  },
  "gpt-realtime-2.1-mini": {
    text: { in: 0.6, cachedIn: 0.06, out: 2.4 },
    audio: { in: 10, cachedIn: 0.3, out: 20 },
  },
};

export interface RealtimeUsage {
  total_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
  input_token_details?: {
    text_tokens?: number;
    audio_tokens?: number;
    cached_tokens?: number;
    cached_tokens_details?: { text_tokens?: number; audio_tokens?: number };
  };
  output_token_details?: { text_tokens?: number; audio_tokens?: number };
}

export function estimateRealtimeCost(model: string, usage: RealtimeUsage): number {
  const price = REALTIME_PRICING[model];
  if (!price) return 0;

  const inText = usage.input_token_details?.text_tokens ?? 0;
  const inAudio = usage.input_token_details?.audio_tokens ?? 0;
  const cachedText = usage.input_token_details?.cached_tokens_details?.text_tokens ?? 0;
  const cachedAudio = usage.input_token_details?.cached_tokens_details?.audio_tokens ?? 0;
  const outText = usage.output_token_details?.text_tokens ?? 0;
  const outAudio = usage.output_token_details?.audio_tokens ?? 0;

  const freshInText = Math.max(0, inText - cachedText);
  const freshInAudio = Math.max(0, inAudio - cachedAudio);

  return (
    (freshInText / 1_000_000) * price.text.in +
    (cachedText / 1_000_000) * price.text.cachedIn +
    (freshInAudio / 1_000_000) * price.audio.in +
    (cachedAudio / 1_000_000) * price.audio.cachedIn +
    (outText / 1_000_000) * price.text.out +
    (outAudio / 1_000_000) * price.audio.out
  );
}

/** 記錄一輪即時語音回覆的用量與成本（會議室每次 Agent 回覆完呼叫一次）。 */
export async function logRealtimeUsage(params: {
  agentSlug?: string | null;
  model: string;
  usage: RealtimeUsage;
  operation?: string;
}) {
  try {
    const cost = estimateRealtimeCost(params.model, params.usage);
    await getMainSupabase()
      .from("ai_usage_logs")
      .insert({
        agent_slug: params.agentSlug ?? null,
        operation: params.operation ?? "會議即時語音",
        model: params.model,
        prompt_tokens: params.usage.input_tokens ?? 0,
        completion_tokens: params.usage.output_tokens ?? 0,
        total_tokens:
          params.usage.total_tokens ?? (params.usage.input_tokens ?? 0) + (params.usage.output_tokens ?? 0),
        cost_usd: cost,
      });
  } catch {
    // 記錄失敗不影響會議進行
  }
}
