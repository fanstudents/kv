import { describe, expect, it } from "vitest";
import { runSubscribersBroadcast, runSubscribersBroadcastRead } from "@/modules/subscribers/broadcast-application";
import type { SubscribersBroadcastPort } from "@/modules/subscribers/broadcast-ports";

const request = {
  kind: "ok" as const,
  input: {
    tags: ["vip"],
    channel: "support" as const,
    text: "公告",
    style: "buttons" as const,
    title: "重要通知",
    accentColor: "#F59E0B",
  },
};

function fakePort(overrides?: Partial<SubscribersBroadcastPort>) {
  const sends: string[] = [];
  const logs: unknown[] = [];
  const port: SubscribersBroadcastPort = {
    async listLogs() {
      return { data: [{ id: "log-1" }], error: null };
    },
    async listRecipients() {
      return {
        data: [
          { id: "s1", line_user_id: "U1", channel: "support" as const },
          { id: "s2", line_user_id: "U2", channel: "primary" as const },
        ],
        error: null,
      };
    },
    async send(recipient) {
      sends.push(recipient.line_user_id);
      if (recipient.line_user_id === "U2") throw new Error("LINE unavailable");
    },
    async recordLog(log) {
      logs.push(log);
    },
    ...overrides,
  };
  return { port, sends, logs };
}

describe("Subscribers broadcast application", () => {
  it("returns broadcast logs and provider errors unchanged", async () => {
    const { port } = fakePort();
    await expect(runSubscribersBroadcastRead(port)).resolves.toEqual({ kind: "ok", data: [{ id: "log-1" }] });
    await expect(runSubscribersBroadcastRead({ ...port, listLogs: async () => ({ data: null, error: { message: "read failed" } }) })).resolves.toEqual({
      kind: "error",
      message: "read failed",
    });
  });

  it("returns the existing missing-text and no-recipient errors", async () => {
    const { port } = fakePort({ listRecipients: async () => ({ data: [], error: null }) });
    await expect(runSubscribersBroadcast({ kind: "invalid", message: "缺少要推播的訊息內容" }, port)).resolves.toEqual({
      kind: "error",
      message: "缺少要推播的訊息內容",
    });
    await expect(runSubscribersBroadcast(request, port)).resolves.toEqual({
      kind: "error",
      message: "沒有符合條件的訂閱者",
    });
  });

  it("fans out independently, counts failures, and records the legacy log row", async () => {
    const { port, sends, logs } = fakePort();
    await expect(runSubscribersBroadcast(request, port)).resolves.toEqual({
      kind: "ok",
      data: { ok: true, recipientCount: 2, successCount: 1, failedCount: 1 },
    });
    expect(sends).toEqual(["U1", "U2"]);
    expect(logs).toEqual([
      {
        tag_filter: "vip",
        channel_filter: "support",
        message_style: "buttons",
        message_text: "公告",
        recipient_count: 2,
        success_count: 1,
        failed_count: 1,
      },
    ]);
  });
});
