export interface LoginRequest {
  password: string;
}

export interface LoginDependencies {
  isConfigured(): boolean;
  verifyPassword(password: string): boolean;
  createSessionToken(): string;
}

export type LoginResult =
  | { kind: "config-error"; message: string }
  | { kind: "invalid-password"; message: string }
  | { kind: "ok"; token: string };

export function parseLoginRequest(body: unknown): LoginRequest {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return { password: typeof input.password === "string" ? input.password : "" };
}

export function runLogin(input: LoginRequest, dependencies: LoginDependencies): LoginResult {
  if (!dependencies.isConfigured()) {
    return {
      kind: "config-error",
      message: "伺服器尚未設定登入密碼（AUTH_SECRET / ADMIN_PASSWORD），請聯繫系統管理員",
    };
  }
  if (!input.password || !dependencies.verifyPassword(input.password)) {
    return { kind: "invalid-password", message: "密碼錯誤" };
  }
  return { kind: "ok", token: dependencies.createSessionToken() };
}

export interface LogoutCookiePolicy {
  value: string;
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: 0;
}

export function buildLogoutCookiePolicy(secure: boolean): LogoutCookiePolicy {
  return {
    value: "",
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  };
}
