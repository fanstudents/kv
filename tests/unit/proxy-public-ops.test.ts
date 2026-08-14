import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  SESSION_COOKIE: "kv_session",
  verifySessionToken: vi.fn(() => false),
}));

import { proxy } from "@/proxy";

describe("public operational route boundary", () => {
  it.each(["/api/health", "/api/version"])("allows %s without an admin session", (path) => {
    const response = proxy(new NextRequest(`http://localhost${path}`));
    expect(response?.status).toBe(200);
  });

  it("continues to reject protected API routes without a session", () => {
    const response = proxy(new NextRequest("http://localhost/api/goals"));
    expect(response?.status).toBe(401);
  });
});
