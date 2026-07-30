import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Reporting legacy adapters", () => {
  it("keeps existing tables, selectors, query window, providers, and renderer in the adapter", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "src",
        "adapters",
        "reporting",
        "legacy-reporting-adapters.ts"
      ),
      "utf8"
    );

    for (const anchor of [
      '.from("line_agents")',
      '.eq("slug", "teamlead")',
      '.from("line_agent_activity")',
      '.gte("occurred_at", cutoff)',
      '.neq("agent_slug", "teamlead")',
      '.order("occurred_at", { ascending: false })',
      ".limit(200)",
      'model: "gpt-4o-mini"',
      'operation: "每日晨報摘要"',
      "pushLineRawMessages(",
      "buildPushMessages(notification)",
      "AGENTS.find(",
    ]) {
      expect(source).toContain(anchor);
    }
  });

  it("keeps the legacy server owner off direct table and provider ownership", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "lib", "team-lead-report.ts"),
      "utf8"
    );

    expect(source).not.toContain('.from("');
    expect(source).not.toContain("@/lib/line");
    expect(source).not.toContain("@/lib/ai-usage");
    expect(source).not.toContain("api.openai.com");
    expect(source).toContain("createLegacyReportingAdapters(supabase)");
  });
});
