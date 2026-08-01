import "server-only";

import { finishRun, logStep, startRun } from "@/lib/agent-runs";
import type { VisitResearchDependencies } from "@/modules/visit/research";
import { openAiVisitResearchProvider } from "@/adapters/visit/openai-visit-research";
import { createSupabaseVisitResearchRepository } from "@/adapters/visit/supabase-visit-research";

export function createVisitResearchDependencies(): VisitResearchDependencies {
  return {
    repository: createSupabaseVisitResearchRepository(),
    provider: openAiVisitResearchProvider,
    runs: {
      start(params) {
        return startRun({
          agentSlug: "visit",
          trigger: "agent",
          ...params,
        });
      },
      step: logStep,
      finish: finishRun,
    },
  };
}
