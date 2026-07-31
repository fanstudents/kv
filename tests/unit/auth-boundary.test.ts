import { describe, expect, it, vi } from "vitest";
import { buildLogoutCookiePolicy, parseLoginRequest, runLogin } from "@/modules/auth/auth";

describe("runLogin", () => {
  it("keeps the missing-configuration response", () => {
    expect(
      runLogin({ password: "secret" }, { isConfigured: () => false, verifyPassword: vi.fn(), createSessionToken: vi.fn() }),
    ).toEqual({
      kind: "config-error",
      message: "伺服器尚未設定登入密碼（AUTH_SECRET / ADMIN_PASSWORD），請聯繫系統管理員",
    });
  });

  it("keeps invalid-password and successful-token branches", () => {
    const verifyPassword = vi.fn(() => false);
    const createSessionToken = vi.fn(() => "token");
    const port = { isConfigured: () => true, verifyPassword, createSessionToken };
    expect(runLogin({ password: "wrong" }, port)).toEqual({ kind: "invalid-password", message: "密碼錯誤" });
    verifyPassword.mockReturnValue(true);
    expect(runLogin({ password: "secret" }, port)).toEqual({ kind: "ok", token: "token" });
    expect(createSessionToken).toHaveBeenCalledOnce();
  });
});

describe("parseLoginRequest", () => {
  it("keeps string passwords", () => {
    expect(parseLoginRequest({ password: "secret" })).toEqual({ password: "secret" });
  });

  it("normalizes missing or non-object bodies", () => {
    expect(parseLoginRequest({ password: 123 })).toEqual({ password: "" });
    expect(parseLoginRequest(null)).toEqual({ password: "" });
  });
});

describe("buildLogoutCookiePolicy", () => {
  it("keeps the development cookie-expiration attributes", () => {
    expect(buildLogoutCookiePolicy(false)).toEqual({
      value: "",
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  });

  it("enables secure transport for production", () => {
    expect(buildLogoutCookiePolicy(true).secure).toBe(true);
  });
});
