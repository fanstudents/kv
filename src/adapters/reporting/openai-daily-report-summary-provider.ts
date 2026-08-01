import "server-only";

import { createChatCompletion } from "@/adapters/openai/client";

export interface DailyReportSummaryConfig {
  operation: string;
  agentSlug: string;
  systemPrompt: string;
}

export function createOpenAiDailyReportSummaryProvider(config: DailyReportSummaryConfig) {
  return {
    async summarize(rawBrief: string): Promise<string | null> {
      if (!process.env.OPENAI_API_KEY) return null;

      try {
        const data = await createChatCompletion(
          {
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: config.systemPrompt },
              { role: "user", content: rawBrief },
            ],
            temperature: 0.4,
          },
          { operation: config.operation, agentSlug: config.agentSlug }
        );
        return data.choices[0]?.message.content ?? null;
      } catch {
        return null;
      }
    },
  };
}
