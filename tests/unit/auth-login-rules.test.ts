import { describe, expect, it } from "vitest";
import { parseLoginRequest } from "@/modules/auth/login-rules";

describe("parseLoginRequest", () => {
  it("keeps string passwords", () => {
    expect(parseLoginRequest({ password: "secret" })).toEqual({ password: "secret" });
  });

  it("normalizes missing or non-object bodies", () => {
    expect(parseLoginRequest({ password: 123 })).toEqual({ password: "" });
    expect(parseLoginRequest(null)).toEqual({ password: "" });
  });
});
