import "server-only";

import { logAiUsage } from "@/lib/ai-usage";

const OPENAI_API_BASE = "https://api.openai.com/v1";

export interface DailyReportSummaryConfig {
  operation: string;
  agentSlug: string;
  systemPrompt: string;
}

export function createOpenAiDailyReportSummaryProvider(config: DailyReportSummaryConfig) {
  return {
    async summarize(rawBrief: string): Promise<string | null> {
      const key = process.env.OPENAI_API_KEY;
      if (!key) return null;

      try {
        const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: config.systemPrompt },
              { role: "user", content: rawBrief },
            ],
            temperature: 0.4,
          }),
        });
        if (!response.ok) return null;
        const data = await response.json();
        await logAiUsage({
          operation: config.operation,
          model: "gpt-4o-mini",
          usage: data.usage,
          agentSlug: config.agentSlug,
        });
        return data.choices?.[0]?.message?.content ?? null;
      } catch {
        return null;
      }
    },
  };
}
