import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  logConversationMessage: vi.fn(),
  touch: vi.fn(),
}));

vi.mock("@/lib/support-conversations", () => ({
  logConversationMessage: mocks.logConversationMessage,
}));
vi.mock("@/adapters/subscribers/supabase-subscribers-repository", () => ({
  supabaseSubscribersRepository: { touch: mocks.touch },
}));

import { createSupportRelayDependencies } from "@/adapters/support/support-relay-dependencies";
import { deriveSupportRelayDeliveryKey } from "@/modules/support/relay";

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function createSupabase(activityError: { message: string } | null = null) {
  const insert = vi.fn().mockResolvedValue({ error: activityError });
  const from = vi.fn(() => ({ insert }));
  return { client: { from } as never, from, insert };
}

describe("Support relay dependencies", () => {
  it("forwards the raw LINE request with the bounded legacy relay contract", async () => {
    vi.stubEnv("SUPPORT_RELAY_TARGET_URL", "https://legacy.example.test/line");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const { client } = createSupabase();
    const ports = createSupportRelayDependencies(client);

    await ports.relay.forward({
      rawBody: '{"events":[]}',
      signature: "line-signature",
      contentType: "application/json",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://legacy.example.test/line",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Line-Signature": "line-signature",
          "X-KV-Support-Relay-Key": deriveSupportRelayDeliveryKey('{"events":[]}'),
        },
        body: '{"events":[]}',
        signal: expect.any(AbortSignal),
      })
    );
  });

  it("fails explicitly when the relay target is unavailable or rejects the request", async () => {
    const { client } = createSupabase();
    const ports = createSupportRelayDependencies(client);
    await expect(
      ports.relay.forward({ rawBody: "{}", signature: "sig", contentType: "application/json" })
    ).rejects.toMatchObject({
      kind: "configuration",
      message: "Missing SUPPORT_RELAY_TARGET_URL environment variable",
    });

    vi.stubEnv("SUPPORT_RELAY_TARGET_URL", "https://legacy.example.test/line");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(
      ports.relay.forward({ rawBody: "{}", signature: "sig", contentType: "application/json" })
    ).rejects.toMatchObject({ kind: "rejected", message: "舊系統回應 503" });
  });

  it("classifies relay transport failures without retrying the legacy POST", async () => {
    vi.stubEnv("SUPPORT_RELAY_TARGET_URL", "https://legacy.example.test/line");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("socket closed")));
    const { client } = createSupabase();
    const ports = createSupportRelayDependencies(client);

    await expect(
      ports.relay.forward({ rawBody: "{}", signature: "sig", contentType: "application/json" })
    ).rejects.toMatchObject({ kind: "network", message: "socket closed" });
  });

  it("delegates subscriber and conversation ownership while surfacing activity failures", async () => {
    const successful = createSupabase();
    const ports = createSupportRelayDependencies(successful.client);

    await ports.repository.recordActivity({ summary: "captured", status: "success" });
    expect(successful.from).toHaveBeenCalledWith("line_agent_activity");
    expect(successful.insert).toHaveBeenCalledWith({
      agent_slug: "support",
      summary: "captured",
      status: "success",
    });

    await ports.subscribers.touch("U123");
    expect(mocks.touch).toHaveBeenCalledWith("U123", "support");
    await ports.conversations.recordCustomerMessage("U123", "Need help");
    expect(mocks.logConversationMessage).toHaveBeenCalledWith("U123", "customer", "Need help");

    const failed = createSupabase({ message: "database unavailable" });
    await expect(
      createSupportRelayDependencies(failed.client).repository.recordActivity({
        summary: "captured",
        status: "success",
      })
    ).rejects.toThrow("Support relay activity write failed: database unavailable");
  });
});
