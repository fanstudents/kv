import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { replyToAgentChat } from "@/adapters/agent-chat/openai-agent-chat-provider";
import {
  embedKnowledgeTexts,
  requestKnowledgeJson,
} from "@/adapters/knowledge-base/openai-knowledge-provider";
import { createOpenAiMeetingAudioProvider } from "@/adapters/meeting/openai-audio-provider";
import { createOpenAiMeetingRealtimeProvider } from "@/adapters/meeting/openai-meeting-realtime-provider";
import { getMainSupabase } from "@/lib/supabase";

const ACCEPTANCE_PREFIX = "codex-oai-acceptance";
const knowledgeOperation = `${ACCEPTANCE_PREFIX}:knowledge-json`;
const embeddingOperation = `${ACCEPTANCE_PREFIX}:embedding`;

beforeAll(() => {
  if (process.env.OPENAI_ACCEPTANCE !== "1") {
    throw new Error(
      "OpenAI acceptance is opt-in. Set OPENAI_ACCEPTANCE=1 before running npm run acceptance:openai."
    );
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OpenAI acceptance requires a server-only OPENAI_API_KEY; no provider calls were made."
    );
  }
});

describe.sequential("controlled OpenAI provider acceptance", () => {
  it("exercises chat, structured JSON, embeddings, audio round-trip, realtime minting, and usage persistence", async () => {
    const startedAt = new Date().toISOString();

    const knowledge = await requestKnowledgeJson({
      model: "gpt-4o-mini",
      operation: knowledgeOperation,
      messages: [
        {
          role: "system",
          content:
            'Return one JSON object with exactly {"status":"ok","fixture":"synthetic"}.',
        },
        { role: "user", content: "Run the controlled synthetic acceptance fixture." },
      ],
      temperature: 0,
      agentSlug: "codex-acceptance",
    });
    expect(knowledge).toMatchObject({ status: "ok", fixture: "synthetic" });

    const vectors = await embedKnowledgeTexts(
      ["Synthetic KV acceptance fixture with no production or personal data."],
      embeddingOperation
    );
    expect(vectors).toHaveLength(1);
    expect(vectors[0]?.length).toBeGreaterThan(0);

    const reply = await replyToAgentChat({
      agent: {
        slug: "codex-acceptance",
        name: "Acceptance Agent",
        role: "測試代理",
        description: "只回覆合成驗收資料，不接觸正式業務資料。",
      },
      message: "請用一句繁體中文確認 controlled acceptance 已收到。",
    });
    expect(reply.length).toBeGreaterThan(0);

    const audioProvider = createOpenAiMeetingAudioProvider();
    const audio = await audioProvider.synthesize({
      text: "這是一段不含個人資料的系統驗收音訊。",
      voice: "alloy",
      instructions: "請用清楚、自然的繁體中文朗讀。",
      speed: 1,
    });
    expect(audio.byteLength).toBeGreaterThan(1_000);

    const transcript = await audioProvider.transcribe({
      audio: new Blob([audio], { type: "audio/mpeg" }),
      promptHint: "系統驗收音訊",
    });
    expect(transcript.length).toBeGreaterThan(0);

    const realtime = (await createOpenAiMeetingRealtimeProvider().mint({
      agentName: "Acceptance Agent",
      role: "測試代理",
      description: "只驗證短效 token，不開啟麥克風或長連線。",
      voice: "alloy",
      isTeamLead: false,
      history: "",
      liveContext: "只有合成驗收資料。",
    })) as { token?: string; expiresAt?: number; model?: string };
    expect(typeof realtime.token).toBe("string");
    expect(realtime.token?.length ?? 0).toBeGreaterThan(10);
    expect(realtime.expiresAt ?? 0).toBeGreaterThan(0);
    expect(realtime.model).toBe("gpt-realtime-2.1");

    const expectedOperations = [knowledgeOperation, embeddingOperation, "網站聊天回應"];
    const { data, error } = await getMainSupabase()
      .from("ai_usage_logs")
      .select("operation,model,total_tokens,agent_slug,created_at")
      .gte("created_at", startedAt)
      .in("operation", expectedOperations);

    expect(error).toBeNull();
    const observedOperations = new Set((data ?? []).map((row) => row.operation));
    for (const operation of expectedOperations) {
      expect(observedOperations.has(operation), `missing usage row for ${operation}`).toBe(true);
    }
  });
});
