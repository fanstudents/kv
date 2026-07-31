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
