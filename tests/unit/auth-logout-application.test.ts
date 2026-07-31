import { describe, expect, it } from "vitest";
import { runLogout } from "@/modules/auth/logout-application";

describe("runLogout", () => {
  it("returns the cookie policy for the route boundary", () => {
    expect(runLogout(false)).toEqual({
      kind: "ok",
      cookie: {
        value: "",
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      },
    });
  });
});
