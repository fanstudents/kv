import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Visit legacy provider adapter", () => {
  it("binds every port capability without loading server-only providers in the test", () => {
    const source = readFileSync(
      join(process.cwd(), "src", "adapters", "visit", "legacy-provider-adapter.ts"),
      "utf8"
    );

    for (const binding of [
      "parseBusinessCard,",
      "interpretCardReply,",
      "draftInviteEmail,",
      "reviseInviteEmail,",
      "findFreeSlots,",
      "sendEmail: sendGmail,",
      "createCalendarEvent,",
    ]) {
      expect(source).toContain(binding);
    }
  });

  it("keeps Visit routes off direct OpenAI and Google provider imports", () => {
    for (const path of [
      join(process.cwd(), "src", "app", "api", "line", "webhook", "route.ts"),
      join(process.cwd(), "src", "app", "api", "agents", "visit", "parse-card", "route.ts"),
      join(process.cwd(), "src", "app", "api", "agents", "visit", "draft-email", "route.ts"),
      join(process.cwd(), "src", "app", "api", "agents", "visit", "respond", "route.ts"),
    ]) {
      const source = readFileSync(path, "utf8");
      expect(source).not.toContain('from "@/lib/openai"');
      expect(source).not.toContain('from "@/lib/google"');
    }
  });
});
