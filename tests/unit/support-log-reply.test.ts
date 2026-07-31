import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { logConversationMessage } = vi.hoisted(() => ({ logConversationMessage: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/support-conversations", () => ({ logConversationMessage }));

import { GET, POST } from "@/app/api/agents/support/log-reply/route";
import { parseSupportLogReplyRequest, recordSupportLogReply } from "@/modules/support/log-reply";

const input = { userId: "U123", text: "已收到" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SUPPORT_LOG_SECRET", "shared-secret");
});

afterEach(() => vi.unstubAllEnvs());

describe("Support log-reply capability", () => {
  it("keeps string userId and text without trimming", () => {
    expect(parseSupportLogReplyRequest({ userId: "U123", text: " 回覆 " })).toEqual({
      userId: "U123",
      text: " 回覆 ",
    });
  });

  it("defaults malformed payload fields to empty strings", () => {
    expect(parseSupportLogReplyRequest(null)).toEqual({ userId: "", text: "" });
    expect(parseSupportLogReplyRequest({ userId: 123, text: null })).toEqual({ userId: "", text: "" });
  });

  it("rejects missing fields before the conversation writer", async () => {
    const writeBotReply = vi.fn();

    await expect(recordSupportLogReply({ userId: "", text: "" }, writeBotReply)).resolves.toEqual({
      kind: "invalid",
      message: "缺少 userId 或 text",
    });
    expect(writeBotReply).not.toHaveBeenCalled();
  });

  it("writes a bot reply through the conversation writer", async () => {
    const writeBotReply = vi.fn().mockResolvedValue(undefined);

    await expect(recordSupportLogReply(input, writeBotReply)).resolves.toEqual({ kind: "ok" });
    expect(writeBotReply).toHaveBeenCalledWith("U123", "已收到");
  });

  it("maps provider errors and non-error throws", async () => {
    const errorWriter = vi.fn().mockRejectedValue(new Error("database down"));
    const fallbackWriter = vi.fn().mockRejectedValue("offline");

    await expect(recordSupportLogReply(input, errorWriter)).resolves.toEqual({
      kind: "provider-failed",
      message: "database down",
    });
    await expect(recordSupportLogReply(input, fallbackWriter)).resolves.toEqual({
      kind: "provider-failed",
      message: "寫入失敗",
    });
  });
});

describe("Support log-reply public callback contract", () => {
  it("keeps the health response", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, service: "support-log-reply" });
  });

  it("keeps the missing-secret and invalid-secret responses", async () => {
    vi.stubEnv("SUPPORT_LOG_SECRET", "");
    const missing = await POST(new NextRequest("http://localhost/api/agents/support/log-reply", {
      method: "POST",
      headers: { "x-log-secret": "shared-secret" },
      body: JSON.stringify(input),
    }));
    expect(missing.status).toBe(500);
    await expect(missing.json()).resolves.toEqual({ error: "Missing SUPPORT_LOG_SECRET environment variable" });

    vi.stubEnv("SUPPORT_LOG_SECRET", "shared-secret");
    const invalid = await POST(new NextRequest("http://localhost/api/agents/support/log-reply", {
      method: "POST",
      headers: { "x-log-secret": "wrong-secret" },
      body: JSON.stringify(input),
    }));
    expect(invalid.status).toBe(401);
    await expect(invalid.json()).resolves.toEqual({ error: "invalid secret" });
    expect(logConversationMessage).not.toHaveBeenCalled();
  });

  it("keeps invalid payload and writer-failure status mapping", async () => {
    const invalid = await POST(new NextRequest("http://localhost/api/agents/support/log-reply", {
      method: "POST",
      headers: { "x-log-secret": "shared-secret" },
      body: "not-json",
    }));
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({ error: "缺少 userId 或 text" });

    logConversationMessage.mockRejectedValueOnce(new Error("database down"));
    const failed = await POST(new NextRequest("http://localhost/api/agents/support/log-reply", {
      method: "POST",
      headers: { "x-log-secret": "shared-secret" },
      body: JSON.stringify(input),
    }));
    expect(failed.status).toBe(502);
    await expect(failed.json()).resolves.toEqual({ error: "database down" });
  });

  it("keeps the successful bot conversation append", async () => {
    logConversationMessage.mockResolvedValueOnce(undefined);

    const response = await POST(new NextRequest("http://localhost/api/agents/support/log-reply", {
      method: "POST",
      headers: { "x-log-secret": "shared-secret" },
      body: JSON.stringify(input),
    }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(logConversationMessage).toHaveBeenCalledWith("U123", "bot", "已收到");
  });
});
