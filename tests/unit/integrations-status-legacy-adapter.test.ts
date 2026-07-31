import { describe, expect, it, vi } from "vitest";

const { getIntegrationStatus } = vi.hoisted(() => ({ getIntegrationStatus: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/integration-status", () => ({ getIntegrationStatus }));

import { createLegacyIntegrationStatusAdapter } from "@/adapters/integrations/legacy-status-adapter";

describe("createLegacyIntegrationStatusAdapter", () => {
  it("keeps the existing status helper behind the port", async () => {
    const status = { gmail: { connected: true, detail: "ops@example.com" } };
    getIntegrationStatus.mockResolvedValue(status);

    const adapter = createLegacyIntegrationStatusAdapter();
    await expect(adapter.getStatus()).resolves.toBe(status);
    expect(getIntegrationStatus).toHaveBeenCalledOnce();
  });
});
