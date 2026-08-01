import "server-only";

import OpenAI, { APIError, toFile } from "openai";
import { z } from "zod";
import type {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
} from "openai/resources/chat/completions";
import type { Response as OpenAiResponse } from "openai/resources/responses/responses";
import type { ClientSecretCreateParams } from "openai/resources/realtime/client-secrets";
import { assertBudget, logAiUsage } from "@/lib/ai-usage";

export interface OpenAiOperationMeta {
  operation: string;
  agentSlug?: string | null;
}

let client: OpenAI | null = null;

export function getOpenAiClient(): OpenAI {
  if (client) return client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY environment variable");
  client = new OpenAI({ apiKey });
  return client;
}

function errorDetail(error: APIError): string {
  if (typeof error.error === "string") return error.error;
  if (error.error) {
    try {
      return JSON.stringify(error.error);
    } catch {
      // Fall through to the SDK message.
    }
  }
  return error.message;
}

function translateApiError(prefix: string, error: unknown): never {
  if (error instanceof APIError) {
    throw new Error(`${prefix} (${error.status}): ${errorDetail(error)}`);
  }
  throw error;
}

export async function createChatCompletion(
  body: ChatCompletionCreateParamsNonStreaming,
  meta: OpenAiOperationMeta
): Promise<ChatCompletion> {
  await assertBudget(meta.operation);
  let data: ChatCompletion;
  try {
    data = await getOpenAiClient().chat.completions.create(body);
  } catch (error) {
    return translateApiError("OpenAI request failed", error);
  }

  await logAiUsage({
    operation: meta.operation,
    model: body.model,
    usage: data.usage,
    agentSlug: meta.agentSlug ?? null,
  });
  return data;
}

interface WebSearchRequest {
  instructions: string;
  input: string;
  model: string;
}

const jsonObjectSchema = z.record(z.string(), z.unknown());

async function createWebSearchResponse(
  body: WebSearchRequest,
  toolType: "web_search" | "web_search_preview"
): Promise<OpenAiResponse> {
  try {
    return await getOpenAiClient().post<OpenAiResponse>("/responses", {
      body: { ...body, tools: [{ type: toolType }] },
    });
  } catch (error) {
    return translateApiError("OpenAI responses failed", error);
  }
}

export async function requestWebSearchResponse(
  body: WebSearchRequest,
  meta: OpenAiOperationMeta
): Promise<OpenAiResponse> {
  await assertBudget(meta.operation);

  let data: OpenAiResponse;
  try {
    data = await createWebSearchResponse(body, "web_search");
  } catch (error) {
    if (error instanceof Error && error.message.includes("(400)")) {
      data = await createWebSearchResponse(body, "web_search_preview");
    } else {
      throw error;
    }
  }

  await logAiUsage({
    operation: meta.operation,
    model: body.model,
    usage: data.usage
      ? {
          prompt_tokens: data.usage.input_tokens,
          completion_tokens: data.usage.output_tokens,
          total_tokens: data.usage.total_tokens,
        }
      : undefined,
    agentSlug: meta.agentSlug ?? null,
  });
  return data;
}

export async function requestWebSearchJson(
  body: WebSearchRequest,
  meta: OpenAiOperationMeta
): Promise<Record<string, unknown>> {
  const data = await requestWebSearchResponse(body, meta);
  const text =
    data.output_text ||
    data.output
      .flatMap((item) => (item.type === "message" ? item.content : []))
      .map((content) => (content.type === "output_text" ? content.text : ""))
      .join("");
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return {};

  try {
    const parsed = jsonObjectSchema.safeParse(JSON.parse(match[0]));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

export async function createEmbeddings(
  texts: string[],
  operation = "知識庫向量化"
): Promise<number[][]> {
  if (texts.length === 0) return [];
  await assertBudget(operation);

  try {
    const data = await getOpenAiClient().embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
    });
    await logAiUsage({
      operation,
      model: "text-embedding-3-small",
      usage: {
        prompt_tokens: data.usage.prompt_tokens,
        total_tokens: data.usage.total_tokens,
      },
      agentSlug: null,
    });
    return data.data.map((item) => item.embedding);
  } catch (error) {
    return translateApiError("OpenAI embeddings failed", error);
  }
}

export async function createTranscription(params: {
  file: Blob;
  model: string;
  promptHint?: string;
}): Promise<string> {
  const extensionByMime: Record<string, string> = {
    "audio/mp4": "m4a",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
    "audio/webm": "webm",
  };
  const mime = params.file.type.split(";", 1)[0].toLowerCase();
  const fileName = `utterance.${extensionByMime[mime] ?? "webm"}`;

  try {
    const data = await getOpenAiClient().audio.transcriptions.create({
      file: await toFile(params.file, fileName),
      model: params.model,
      language: "zh",
      ...(params.promptHint ? { prompt: params.promptHint } : {}),
    });
    return data.text.trim();
  } catch (error) {
    return translateApiError("OpenAI transcription failed", error);
  }
}

export async function createSpeech(params: {
  model: string;
  voice: string;
  input: string;
  instructions?: string;
  speed?: number;
}): Promise<ArrayBuffer> {
  try {
    const response = await getOpenAiClient().audio.speech.create({
      model: params.model,
      voice: params.voice,
      input: params.input,
      response_format: "mp3",
      ...(params.instructions ? { instructions: params.instructions } : {}),
      ...(params.speed ? { speed: params.speed } : {}),
    });
    return response.arrayBuffer();
  } catch (error) {
    return translateApiError("OpenAI speech synthesis failed", error);
  }
}

export async function createRealtimeClientSecret(
  session: unknown
): Promise<{ value: string; expiresAt: number }> {
  try {
    const data = await getOpenAiClient().realtime.clientSecrets.create({
      session: session as ClientSecretCreateParams["session"],
    });
    return { value: data.value, expiresAt: data.expires_at };
  } catch (error) {
    return translateApiError("OpenAI realtime session failed", error);
  }
}
