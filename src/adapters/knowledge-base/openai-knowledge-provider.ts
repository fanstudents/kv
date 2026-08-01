import "server-only";

import { z } from "zod";
import { createChatCompletion, createEmbeddings } from "@/adapters/openai/client";

const jsonObjectSchema = z.record(z.string(), z.unknown());

export async function requestKnowledgeJson(params: {
  model: string;
  operation: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  temperature?: number;
  agentSlug?: string | null;
}): Promise<Record<string, unknown>> {
  const data = await createChatCompletion(
    {
      model: params.model,
      messages: params.messages,
      response_format: { type: "json_object" },
      temperature: params.temperature ?? 0.2,
    },
    { operation: params.operation, agentSlug: params.agentSlug ?? null }
  );

  const content = data.choices[0]?.message.content ?? "{}";
  try {
    const parsed = jsonObjectSchema.safeParse(JSON.parse(content));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

export function embedKnowledgeTexts(
  texts: string[],
  operation = "知識庫向量化"
): Promise<number[][]> {
  return createEmbeddings(texts, operation);
}
