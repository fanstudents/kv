import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class FakeApiError extends Error {
    constructor(
      readonly status: number,
      readonly error: unknown
    ) {
      super(typeof error === "string" ? error : "api error");
    }
  }

  return {
    FakeApiError,
    chatCreate: vi.fn(),
    post: vi.fn(),
    embeddingsCreate: vi.fn(),
    transcriptionCreate: vi.fn(),
    speechCreate: vi.fn(),
    clientSecretCreate: vi.fn(),
    toFile: vi.fn(async (file: Blob) => file),
    assertBudget: vi.fn(),
    logAiUsage: vi.fn(),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("openai", () => ({
  APIError: mocks.FakeApiError,
  toFile: mocks.toFile,
  default: class FakeOpenAi {
    chat = { completions: { create: mocks.chatCreate } };
    post = mocks.post;
    embeddings = { create: mocks.embeddingsCreate };
    audio = {
      transcriptions: { create: mocks.transcriptionCreate },
      speech: { create: mocks.speechCreate },
    };
    realtime = { clientSecrets: { create: mocks.clientSecretCreate } };
  },
}));
vi.mock("@/lib/ai-usage", () => ({
  assertBudget: mocks.assertBudget,
  logAiUsage: mocks.logAiUsage,
}));

import {
  createChatCompletion,
  createEmbeddings,
  createRealtimeClientSecret,
  createSpeech,
  createTranscription,
  requestWebSearchJson,
} from "@/adapters/openai/client";

const originalOpenAiKey = process.env.OPENAI_API_KEY;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OPENAI_API_KEY = "test-key";
});

afterAll(() => {
  if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalOpenAiKey;
});

describe("OpenAI shared SDK client", () => {
  it("keeps budget, request, usage, and operation identity around chat completions", async () => {
    const response = {
      choices: [{ message: { content: "reply" } }],
      usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 },
    };
    mocks.chatCreate.mockResolvedValue(response);

    await expect(
      createChatCompletion(
        { model: "gpt-4o-mini", messages: [{ role: "user", content: "hello" }] },
        { operation: "chat", agentSlug: "report" }
      )
    ).resolves.toBe(response);
    expect(mocks.assertBudget).toHaveBeenCalledWith("chat");
    expect(mocks.chatCreate).toHaveBeenCalledWith({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "hello" }],
    });
    expect(mocks.logAiUsage).toHaveBeenCalledWith({
      operation: "chat",
      model: "gpt-4o-mini",
      usage: response.usage,
      agentSlug: "report",
    });
  });

  it("stops before SDK and usage logging when the budget guard rejects", async () => {
    mocks.assertBudget.mockRejectedValueOnce(new Error("budget exceeded"));

    await expect(
      createChatCompletion(
        { model: "gpt-4o-mini", messages: [{ role: "user", content: "hello" }] },
        { operation: "chat", agentSlug: "report" }
      )
    ).rejects.toThrow("budget exceeded");

    expect(mocks.chatCreate).not.toHaveBeenCalled();
    expect(mocks.logAiUsage).not.toHaveBeenCalled();
  });

  it("translates failed SDK requests without recording successful usage", async () => {
    mocks.chatCreate.mockRejectedValueOnce(new mocks.FakeApiError(429, { message: "rate limited" }));
    mocks.embeddingsCreate.mockRejectedValueOnce(new mocks.FakeApiError(503, "embeddings unavailable"));

    await expect(
      createChatCompletion(
        { model: "gpt-4o-mini", messages: [{ role: "user", content: "hello" }] },
        { operation: "chat" }
      )
    ).rejects.toThrow('OpenAI request failed (429): {"message":"rate limited"}');
    await expect(createEmbeddings(["text"], "embed")).rejects.toThrow(
      "OpenAI embeddings failed (503): embeddings unavailable"
    );

    expect(mocks.logAiUsage).not.toHaveBeenCalled();
  });

  it("preserves the web-search tool fallback and safe malformed JSON result", async () => {
    mocks.post
      .mockRejectedValueOnce(new mocks.FakeApiError(400, { message: "unsupported tool" }))
      .mockResolvedValueOnce({
        output_text: '{"company":"TBR"}',
        output: [],
        usage: { input_tokens: 4, output_tokens: 3, total_tokens: 7 },
      });

    await expect(
      requestWebSearchJson(
        { model: "gpt-4o", instructions: "research", input: "Dennis" },
        { operation: "research", agentSlug: "visit" }
      )
    ).resolves.toEqual({ company: "TBR" });
    expect(mocks.post).toHaveBeenNthCalledWith(
      1,
      "/responses",
      expect.objectContaining({ body: expect.objectContaining({ tools: [{ type: "web_search" }] }) })
    );
    expect(mocks.post).toHaveBeenNthCalledWith(
      2,
      "/responses",
      expect.objectContaining({ body: expect.objectContaining({ tools: [{ type: "web_search_preview" }] }) })
    );

    mocks.post.mockResolvedValueOnce({ output_text: "not-json", output: [], usage: undefined });
    await expect(
      requestWebSearchJson(
        { model: "gpt-4o", instructions: "research", input: "Dennis" },
        { operation: "research" }
      )
    ).resolves.toEqual({});
  });

  it("maps embeddings, audio, and realtime calls through the official SDK", async () => {
    mocks.embeddingsCreate.mockResolvedValue({
      data: [{ embedding: [0.1, 0.2] }],
      usage: { prompt_tokens: 2, total_tokens: 2 },
    });
    mocks.transcriptionCreate.mockResolvedValue({ text: " transcript " });
    const audio = new ArrayBuffer(3);
    mocks.speechCreate.mockResolvedValue({ arrayBuffer: vi.fn(async () => audio) });
    mocks.clientSecretCreate.mockResolvedValue({ value: "token", expires_at: 123 });
    const blob = new Blob(["audio"], { type: "audio/mpeg" });

    await expect(createEmbeddings(["text"], "embed")).resolves.toEqual([[0.1, 0.2]]);
    await expect(
      createTranscription({ file: blob, model: "whisper-1", promptHint: "Ivy" })
    ).resolves.toBe("transcript");
    await expect(
      createSpeech({ model: "tts-1", voice: "nova", input: "hello", speed: 1.2 })
    ).resolves.toBe(audio);
    await expect(createRealtimeClientSecret({ type: "realtime" })).resolves.toEqual({
      value: "token",
      expiresAt: 123,
    });
    expect(mocks.embeddingsCreate).toHaveBeenCalledWith({
      model: "text-embedding-3-small",
      input: ["text"],
    });
    expect(mocks.transcriptionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ file: blob, model: "whisper-1", language: "zh", prompt: "Ivy" })
    );
    expect(mocks.toFile).toHaveBeenCalledWith(blob, "utterance.mp3");
    expect(mocks.clientSecretCreate).toHaveBeenCalledWith({ session: { type: "realtime" } });
  });
});
