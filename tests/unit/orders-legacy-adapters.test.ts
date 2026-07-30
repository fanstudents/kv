import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Orders legacy adapters", () => {
  it("keeps current tables, conflict key, Agent selector, and LINE renderer in the adapter", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "adapters", "orders", "legacy-orders-adapters.ts"),
      "utf8"
    );

    for (const anchor of [
      '.from("teachify_orders")',
      '{ onConflict: "order_id" }',
      '.from("line_agents")',
      '.eq("slug", "orders")',
      '.from("line_agent_activity")',
      "pushLineRawMessages(",
      "buildPushMessages(notification)",
    ]) {
      expect(source).toContain(anchor);
    }
  });

  it("keeps the webhook route off direct database table and LINE delivery ownership", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "app", "api", "webhooks", "teachify-order", "route.ts"),
      "utf8"
    );

    expect(source).not.toContain('.from("');
    expect(source).not.toContain("@/lib/line");
    expect(source).not.toContain("@/lib/line-message-styles");
    expect(source).toContain("createLegacyOrdersAdapters(supabase)");
  });
});
