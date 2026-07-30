import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Support report legacy adapters", () => {
  it("keeps current tables, selectors, query order, providers, and renderer in the adapter", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "src",
        "adapters",
        "support",
        "legacy-support-report-adapters.ts"
      ),
      "utf8"
    );

    for (const anchor of [
      '.from("line_agents")',
      '.eq("slug", "support")',
      '.from("line_support_conversations")',
      '.eq("role", "customer")',
      '.gte("occurred_at", cutoff)',
      '.order("occurred_at", { ascending: true })',
      ".limit(500)",
      '.from("line_subscribers")',
      '.eq("channel", "support")',
      '.in("line_user_id", lineUserIds)',
      '.from("line_agent_activity")',
      'model: "gpt-4o-mini"',
      'operation: "客服每日彙報摘要"',
      "pushLineRawMessages(",
      "buildPushMessages(notification)",
    ]) {
      expect(source).toContain(anchor);
    }
  });

  it("keeps the server compatibility owner off direct table and provider ownership", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "lib", "support-daily-report.ts"),
      "utf8"
    );

    expect(source).not.toContain('.from("');
    expect(source).not.toContain("@/lib/line");
    expect(source).not.toContain("@/lib/ai-usage");
    expect(source).not.toContain("api.openai.com");
    expect(source).toContain("createLegacySupportReportAdapters(supabase)");
  });
});
