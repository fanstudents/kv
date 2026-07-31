import { describe, expect, it, vi } from "vitest";
import { runIntegrationStatus } from "@/modules/integrations/status-application";

describe("runIntegrationStatus", () => {
  it("returns the provider result without changing its map shape", async () => {
    const status = { openai: { connected: true }, supabase: { connected: false, detail: "missing" } };
    const getStatus = vi.fn(async () => status);

    await expect(runIntegrationStatus({ getStatus })).resolves.toBe(status);
    expect(getStatus).toHaveBeenCalledOnce();
  });
});
