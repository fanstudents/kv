import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Support relay legacy adapters", () => {
  it("keeps the raw relay contract and legacy side-effect owners in the adapter", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "src",
        "adapters",
        "support",
        "legacy-support-relay-adapters.ts"
      ),
      "utf8"
    );

    for (const anchor of [
      "process.env.SUPPORT_RELAY_TARGET_URL",
      'method: "POST"',
      '"Content-Type": request.contentType',
      '"X-Line-Signature": request.signature',
      "body: request.rawBody",
      "AbortSignal.timeout(8000)",
      "`舊系統回應 ${response.status}`",
      '.from("line_agent_activity")',
      'agent_slug: "support"',
      "supabaseSubscribersRepository",
      'supabaseSubscribersRepository.touch(lineUserId, "support")',
      'logConversationMessage(lineUserId, "customer", text)',
    ]) {
      expect(source).toContain(anchor);
    }
  });

  it("keeps the route off direct relay fetch and legacy persistence helpers", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "src",
        "app",
        "api",
        "line",
        "webhook",
        "support",
        "route.ts"
      ),
      "utf8"
    );

    expect(source).not.toContain("fetch(");
    expect(source).not.toContain('.from("');
    expect(source).not.toContain("touchSubscriber(");
    expect(source).not.toContain("logConversationMessage(");
    expect(source).toContain("createLegacySupportRelayAdapters(supabase)");
  });
});
