import { describe, expect, it } from "vitest";
import { parseCronAuth } from "@/modules/cron/auth-rules";

describe("cron authorization rules", () => {
  it("fails closed when CRON_SECRET is missing", () => {
    expect(parseCronAuth(undefined, "anything")).toEqual({
      kind: "misconfigured",
      message: "server misconfigured: CRON_SECRET not set",
      status: 503,
    });
    expect(parseCronAuth("", "anything")).toEqual({
      kind: "misconfigured",
      message: "server misconfigured: CRON_SECRET not set",
      status: 503,
    });
  });

  it("rejects missing or mismatched headers", () => {
    expect(parseCronAuth("expected", null)).toEqual({ kind: "unauthorized", message: "unauthorized", status: 401 });
    expect(parseCronAuth("expected", "other")).toEqual({ kind: "unauthorized", message: "unauthorized", status: 401 });
  });

  it("accepts the exact configured secret", () => {
    expect(parseCronAuth("expected", "expected")).toEqual({ kind: "authorized" });
  });
});
