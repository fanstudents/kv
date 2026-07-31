import { beforeEach, describe, expect, it, vi } from "vitest";

const { getIntegrationStatus } = vi.hoisted(() => ({ getIntegrationStatus: vi.fn() }));

vi.mock("@/lib/integration-status", () => ({ getIntegrationStatus }));

import { GET } from "@/app/api/integrations/status/route";

beforeEach(() => vi.clearAllMocks());

describe("integration status route contract", () => {
  it("keeps the provider status map without changing its shape", async () => {
    const status = { openai: { connected: true }, supabase: { connected: false, detail: "missing" } };
    getIntegrationStatus.mockResolvedValue(status);

    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(status);
    expect(getIntegrationStatus).toHaveBeenCalledOnce();
  });

  it("keeps provider failures outside a new route error boundary", async () => {
    getIntegrationStatus.mockRejectedValueOnce(new Error("integration check failed"));

    await expect(GET()).rejects.toThrow("integration check failed");
  });
});
