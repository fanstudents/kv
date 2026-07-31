import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { createSupabaseAgentAdminRepository, createLineAgentTestPushAdapter } = vi.hoisted(() => ({
  createSupabaseAgentAdminRepository: vi.fn(),
  createLineAgentTestPushAdapter: vi.fn(),
}));

vi.mock("@/adapters/agents/supabase-agent-admin-repository", () => ({ createSupabaseAgentAdminRepository }));
vi.mock("@/adapters/agents/line-agent-test-push-adapter", () => ({ createLineAgentTestPushAdapter }));

import { GET as getStatuses } from "@/app/api/agents/route";
import { GET as getAgent, PATCH as patchAgent } from "@/app/api/agents/[slug]/route";
import { POST as postTestPush } from "@/app/api/agents/[slug]/test-push/route";

const params = Promise.resolve({ slug: "operations" });

beforeEach(() => {
  vi.clearAllMocks();
  createSupabaseAgentAdminRepository.mockReturnValue({
    getBySlug: vi.fn(async () => ({ data: { slug: "operations", enabled: true }, errorMessage: null })),
    updateBySlug: vi.fn(async () => ({ data: { slug: "operations", enabled: false }, errorMessage: null })),
    listStatuses: vi.fn(async () => ({ data: [{ slug: "operations", enabled: true }], error: null })),
    recordActivity: vi.fn(async () => undefined),
  });
  createLineAgentTestPushAdapter.mockReturnValue({
    send: vi.fn(async () => undefined),
    recordFailure: vi.fn(async () => undefined),
    recordSuccess: vi.fn(async () => ({ id: "activity-1" })),
  });
});

describe("agent admin route contracts", () => {
  it("keeps the database-backed status response", async () => {
    const response = await getStatuses();
    await expect(response.json()).resolves.toMatchObject({ enabled: { operations: true } });
  });

  it("keeps GET not-found and PATCH JSON/error mappings", async () => {
    createSupabaseAgentAdminRepository.mockReturnValueOnce({
      getBySlug: vi.fn(async () => ({ data: null, errorMessage: "not found" })),
    });
    const missing = await getAgent(new NextRequest("http://localhost/api/agents/missing"), { params });
    expect(missing.status).toBe(404);
    await expect(missing.json()).resolves.toEqual({ error: "not found" });

    const repository = {
      updateBySlug: vi.fn(async () => ({ data: null, errorMessage: "permission denied" })),
      recordActivity: vi.fn(async () => undefined),
    };
    createSupabaseAgentAdminRepository.mockReturnValueOnce(repository);
    const failedUpdate = await patchAgent(
      new NextRequest("http://localhost/api/agents/operations", { method: "PATCH", body: "not-json" }),
      { params },
    );
    expect(failedUpdate.status).toBe(400);
    await expect(failedUpdate.json()).resolves.toEqual({ error: "permission denied" });
    expect(repository.updateBySlug).toHaveBeenCalledWith("operations", { updated_at: expect.any(String) });
  });

  it("keeps test-push validation and delivery failure statuses", async () => {
    const invalid = await postTestPush(
      new NextRequest("http://localhost/api/agents/operations/test-push", { method: "POST", body: "{}" }),
      { params },
    );
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({ error: "缺少測試對象 LINE User ID" });

    createLineAgentTestPushAdapter.mockReturnValueOnce({
      send: vi.fn(async () => { throw new Error("LINE down"); }),
      recordFailure: vi.fn(async () => undefined),
      recordSuccess: vi.fn(),
    });
    const failed = await postTestPush(
      new NextRequest("http://localhost/api/agents/operations/test-push", {
        method: "POST",
        body: JSON.stringify({ to: "U1", text: "hello" }),
      }),
      { params },
    );
    expect(failed.status).toBe(502);
    await expect(failed.json()).resolves.toEqual({ error: "LINE down" });
  });
});
