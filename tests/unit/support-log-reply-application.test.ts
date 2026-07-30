import { describe, expect, it, vi } from "vitest";
import { runSupportLogReply } from "@/modules/support/log-reply-application";

const input = { userId: "U123", text: "已收到" };

describe("Support log-reply application", () => {
  it("rejects missing fields before the conversation port", async () => {
    const port = { logBotReply: vi.fn() };

    await expect(runSupportLogReply({ userId: "", text: "" }, port)).resolves.toEqual({
      kind: "invalid",
      message: "缺少 userId 或 text",
    });
    expect(port.logBotReply).not.toHaveBeenCalled();
  });

  it("writes a bot reply through the port", async () => {
    const port = { logBotReply: vi.fn().mockResolvedValue(undefined) };

    await expect(runSupportLogReply(input, port)).resolves.toEqual({ kind: "ok" });
    expect(port.logBotReply).toHaveBeenCalledWith("U123", "已收到");
  });

  it("maps provider errors and non-error throws", async () => {
    const errorPort = { logBotReply: vi.fn().mockRejectedValue(new Error("database down")) };
    const fallbackPort = { logBotReply: vi.fn().mockRejectedValue("offline") };

    await expect(runSupportLogReply(input, errorPort)).resolves.toEqual({
      kind: "provider-failed",
      message: "database down",
    });
    await expect(runSupportLogReply(input, fallbackPort)).resolves.toEqual({
      kind: "provider-failed",
      message: "寫入失敗",
    });
  });
});
