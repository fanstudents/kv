import type { LoginPort } from "./login-ports";
import type { LoginRequest } from "./login-rules";

export type LoginResult =
  | { kind: "config-error"; message: string }
  | { kind: "invalid-password"; message: string }
  | { kind: "ok"; token: string };

export function runLogin(input: LoginRequest, port: LoginPort): LoginResult {
  if (!port.isConfigured()) {
    return {
      kind: "config-error",
      message: "伺服器尚未設定登入密碼（AUTH_SECRET / ADMIN_PASSWORD），請聯繫系統管理員",
    };
  }
  if (!input.password || !port.verifyPassword(input.password)) {
    return { kind: "invalid-password", message: "密碼錯誤" };
  }
  return { kind: "ok", token: port.createSessionToken() };
}
