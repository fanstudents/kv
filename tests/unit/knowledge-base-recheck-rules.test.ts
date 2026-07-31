import { describe, expect, it } from "vitest";
import { parseKnowledgeBaseRecheckAuth } from "@/modules/knowledge-base/recheck-rules";

describe("knowledge base recheck authorization rules", () => {
  it("fails closed when CRON_SECRET is missing", () => {
    expect(parseKnowledgeBaseRecheckAuth(undefined, "anything")).toEqual({
      kind: "misconfigured",
      message: "server misconfigured: CRON_SECRET not set",
      status: 503,
    });
    expect(parseKnowledgeBaseRecheckAuth("", "anything")).toEqual({
      kind: "misconfigured",
      message: "server misconfigured: CRON_SECRET not set",
      status: 503,
    });
  });

  it("rejects missing or mismatched headers", () => {
    expect(parseKnowledgeBaseRecheckAuth("expected", null)).toEqual({
      kind: "unauthorized",
      message: "unauthorized",
      status: 401,
    });
    expect(parseKnowledgeBaseRecheckAuth("expected", "other")).toEqual({
      kind: "unauthorized",
      message: "unauthorized",
      status: 401,
    });
  });

  it("accepts the exact configured secret", () => {
    expect(parseKnowledgeBaseRecheckAuth("expected", "expected")).toEqual({ kind: "authorized" });
  });
});
