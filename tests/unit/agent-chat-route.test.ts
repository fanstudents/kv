import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { createAgentChatComposition } = vi.hoisted(() => ({ createAgentChatComposition: vi.fn() }));

vi.mock("@/adapters/agent-chat/agent-chat-composition", () => ({ createAgentChatComposition }));

import { POST } from "@/app/api/agent-chat/route";

beforeEach(() => {
  vi.clearAllMocks();
  createAgentChatComposition.mockReturnValue({
    agents: { find: vi.fn(() => ({ slug: "report", name: "Ivy", role: "reporter", description: "desc", isTeamLead: false })) },
    context: { load: vi.fn(async () => "context") },
    replies: { generate: vi.fn(async () => "reply") },
    canvas: { build: vi.fn(async () => null) },
  });
});

describe("Agent chat route contract", () => {
  it("keeps missing input at 400 without composing providers", async () => {
    const response = await POST(new NextRequest("http://localhost/api/agent-chat", { method: "POST", body: "{}" }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "缺少 agentSlug 或 message" });
    expect(createAgentChatComposition).not.toHaveBeenCalled();
  });

  it("keeps malformed JSON on the same missing-input response", async () => {
    const response = await POST(new NextRequest("http://localhost/api/agent-chat", { method: "POST", body: "not-json" }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "缺少 agentSlug 或 message" });
  });

  it("keeps unknown Agent and provider failure status mapping", async () => {
    createAgentChatComposition.mockReturnValueOnce({
      agents: { find: vi.fn(() => null) },
      context: { load: vi.fn() },
      replies: { generate: vi.fn() },
      canvas: { build: vi.fn() },
    });
    const unknown = await POST(new NextRequest("http://localhost/api/agent-chat", {
      method: "POST",
      body: JSON.stringify({ agentSlug: "missing", message: "hello" }),
    }));
    expect(unknown.status).toBe(404);
    await expect(unknown.json()).resolves.toEqual({ error: "找不到這位 Agent" });

    createAgentChatComposition.mockReturnValueOnce({
      agents: { find: vi.fn(() => ({ slug: "report", name: "Ivy", role: "reporter", description: "desc", isTeamLead: false })) },
      context: { load: vi.fn(async () => "") },
      replies: { generate: vi.fn(async () => { throw new Error("provider down"); }) },
      canvas: { build: vi.fn() },
    });
    const failed = await POST(new NextRequest("http://localhost/api/agent-chat", {
      method: "POST",
      body: JSON.stringify({ agentSlug: "report", message: "hello" }),
    }));
    expect(failed.status).toBe(502);
    await expect(failed.json()).resolves.toEqual({ error: "provider down" });
  });

  it("keeps the success response shape", async () => {
    createAgentChatComposition.mockReturnValueOnce({
      agents: { find: vi.fn(() => ({ slug: "report", name: "Ivy", role: "reporter", description: "desc", isTeamLead: false })) },
      context: { load: vi.fn(async () => "context") },
      replies: { generate: vi.fn(async () => "reply") },
      canvas: { build: vi.fn(async () => ({ kind: "action-plan" })) },
    });
    const response = await POST(new NextRequest("http://localhost/api/agent-chat", {
      method: "POST",
      body: JSON.stringify({ agentSlug: "report", message: "hello", history: "old" }),
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ reply: "reply", canvas: { kind: "action-plan" } });
  });

  it("keeps the empty-reply fallback while retaining the canvas response", async () => {
    createAgentChatComposition.mockReturnValueOnce({
      agents: { find: vi.fn(() => ({ slug: "report", name: "Ivy", role: "reporter", description: "desc", isTeamLead: false })) },
      context: { load: vi.fn(async () => "context") },
      replies: { generate: vi.fn(async () => "") },
      canvas: { build: vi.fn(async () => ({ kind: "action-plan" })) },
    });
    const response = await POST(new NextRequest("http://localhost/api/agent-chat", {
      method: "POST",
      body: JSON.stringify({ agentSlug: "report", message: "hello" }),
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ reply: "收到，我確認後回覆您。", canvas: { kind: "action-plan" } });
  });
});
