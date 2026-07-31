import { describe, expect, it } from "vitest";
import { buildLogoutCookiePolicy } from "@/modules/auth/logout-rules";

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
