import { describe, expect, it, vi } from "vitest";
import { runLogin } from "@/modules/auth/login-application";

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
