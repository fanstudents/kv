import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  activityPort,
  contactTagPort,
  conversationLockPort,
  createLegacyVisitLineActivityAdapter,
  createLegacyVisitLineDeliveryAdapter,
  createLegacyVisitLineWorkflowAdapter,
  createLiveTaskStateRepository,
  createSupabaseConversationLock,
  lineDeliveryPort,
  lineWorkflowPort,
  liveTaskPort,
  runVisitTimeoutApplication,
} = vi.hoisted(() => {
  const activityPort = { port: "visit-activity" };
  const contactTagPort = { port: "contact-tags" };
  const conversationLockPort = { port: "conversation-lock" };
  const lineDeliveryPort = { port: "line-delivery" };
  const lineWorkflowPort = { port: "line-workflow" };
  const liveTaskPort = { port: "live-task" };

  return {
    activityPort,
    contactTagPort,
    conversationLockPort,
    createLegacyVisitLineActivityAdapter: vi.fn(() => activityPort),
    createLegacyVisitLineDeliveryAdapter: vi.fn(() => lineDeliveryPort),
    createLegacyVisitLineWorkflowAdapter: vi.fn(() => lineWorkflowPort),
    createLiveTaskStateRepository: vi.fn(() => liveTaskPort),
    createSupabaseConversationLock: vi.fn(() => conversationLockPort),
    lineDeliveryPort,
    lineWorkflowPort,
    liveTaskPort,
    runVisitTimeoutApplication: vi.fn(),
  };
});

vi.mock("@/adapters/conversation/supabase-conversation-lock", () => ({
  createSupabaseConversationLock,
}));

vi.mock("@/adapters/operations/supabase-operations-repository", () => ({
  supabaseOperationsRepository: contactTagPort,
}));

vi.mock("@/adapters/live-task/live-task-state-repository", () => ({
  createLiveTaskStateRepository,
}));

vi.mock("@/adapters/visit/legacy-line-adapters", () => ({
  createLegacyVisitLineActivityAdapter,
  createLegacyVisitLineDeliveryAdapter,
}));

vi.mock("@/adapters/visit/legacy-line-workflow-adapter", () => ({
  createLegacyVisitLineWorkflowAdapter,
}));

vi.mock("@/modules/visit/timeout-application", () => ({
  runVisitTimeoutApplication,
}));

import { GET } from "@/app/api/cron/visit-timeout/route";

const originalCronSecret = process.env.CRON_SECRET;

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.CRON_SECRET;
});

afterEach(() => {
  if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalCronSecret;
});

function request(secret?: string) {
  return new NextRequest("http://localhost/api/cron/visit-timeout", {
    headers: secret ? { "x-cron-key": secret } : undefined,
  });
}

describe("visit timeout cron route contract", () => {
  it("fails closed before the timeout application when the cron secret is missing or wrong", async () => {
    const missing = await GET(request());
    expect(missing.status).toBe(503);
    await expect(missing.json()).resolves.toEqual({ error: "server misconfigured: CRON_SECRET not set" });

    process.env.CRON_SECRET = "cron-secret";
    const wrong = await GET(request("wrong-secret"));
    expect(wrong.status).toBe(401);
    await expect(wrong.json()).resolves.toEqual({ error: "unauthorized" });

    expect(runVisitTimeoutApplication).not.toHaveBeenCalled();
    expect(createLegacyVisitLineActivityAdapter).not.toHaveBeenCalled();
    expect(createLiveTaskStateRepository).not.toHaveBeenCalled();
  });

  it("keeps the authorized timeout envelope and wires the existing ports into the application", async () => {
    process.env.CRON_SECRET = "cron-secret";
    runVisitTimeoutApplication.mockResolvedValue(4);

    const response = await GET(request("cron-secret"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, handled: 4 });
    expect(runVisitTimeoutApplication).toHaveBeenCalledWith({
      workflow: lineWorkflowPort,
      tags: contactTagPort,
      activity: activityPort,
      liveTask: liveTaskPort,
      delivery: lineDeliveryPort,
      lock: conversationLockPort,
    });
    expect(createLegacyVisitLineActivityAdapter).toHaveBeenCalledTimes(1);
    expect(createLiveTaskStateRepository).toHaveBeenCalledTimes(1);
  });
});
