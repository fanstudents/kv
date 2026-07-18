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
