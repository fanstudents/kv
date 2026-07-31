import { buildLogoutCookiePolicy, type LogoutCookiePolicy } from "./logout-rules";

export type LogoutResult = { kind: "ok"; cookie: LogoutCookiePolicy };

export function runLogout(secure: boolean): LogoutResult {
  return { kind: "ok", cookie: buildLogoutCookiePolicy(secure) };
}
