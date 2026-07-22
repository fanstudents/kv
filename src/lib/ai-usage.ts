import "server-only";
import { getSupabase } from "@/lib/supabase";

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
    await getSupabase()
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
    await getSupabase()
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
