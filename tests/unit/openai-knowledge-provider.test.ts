import { beforeEach, describe, expect, it, vi } from "vitest";

const { createChatCompletion, createEmbeddings } = vi.hoisted(() => ({
  createChatCompletion: vi.fn(),
  createEmbeddings: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/adapters/openai/client", () => ({ createChatCompletion, createEmbeddings }));

import { embedKnowledgeTexts, requestKnowledgeJson } from "@/adapters/knowledge-base/openai-knowledge-provider";

beforeEach(() => vi.clearAllMocks());

describe("OpenAI knowledge provider", () => {
  const params = {
    model: "gpt-4o-mini",
    operation: "knowledge-json",
    messages: [{ role: "user" as const, content: "classify this fixture" }],
    agentSlug: "knowledge",
  };

  it("keeps malformed structured output fail-closed as an empty object", async () => {
    createChatCompletion.mockResolvedValue({ choices: [{ message: { content: "not-json" } }] });

    await expect(requestKnowledgeJson(params)).resolves.toEqual({});
    expect(createChatCompletion).toHaveBeenCalledWith(
      {
        model: "gpt-4o-mini",
        messages: params.messages,
        response_format: { type: "json_object" },
        temperature: 0.2,
      },
      { operation: "knowledge-json", agentSlug: "knowledge" }
    );
  });

  it("preserves provider failures instead of fabricating structured data", async () => {
    createChatCompletion.mockRejectedValueOnce(new Error("provider unavailable"));

    await expect(requestKnowledgeJson(params)).rejects.toThrow("provider unavailable");
  });

  it("delegates embeddings without changing the operation identity", async () => {
    createEmbeddings.mockResolvedValueOnce([[0.1, 0.2]]);

    await expect(embedKnowledgeTexts(["fixture"], "knowledge-embedding")).resolves.toEqual([[0.1, 0.2]]);
    expect(createEmbeddings).toHaveBeenCalledWith(["fixture"], "knowledge-embedding");
  });
});
