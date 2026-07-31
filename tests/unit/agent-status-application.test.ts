import { describe, expect, it } from "vitest";
import { runAgentStatusRead } from "@/modules/agents/status-read-application";

describe("runAgentStatusRead", () => {
  const catalog = [{ slug: "active", status: "active" }];

  it("returns database-backed status data", async () => {
    await expect(
      runAgentStatusRead(
        { list: async () => ({ data: [{ slug: "active", enabled: false }], error: null }) },
        catalog,
      ),
    ).resolves.toEqual({ enabled: { active: false } });
  });

  it("falls back to catalog status when the provider throws", async () => {
    await expect(
      runAgentStatusRead(
        { list: async () => { throw new Error("unavailable"); } },
        catalog,
      ),
    ).resolves.toEqual({ enabled: { active: true } });
  });
});
