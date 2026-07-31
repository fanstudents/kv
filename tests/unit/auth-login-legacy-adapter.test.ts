import { describe, expect, it, vi } from "vitest";

const { createSessionToken, verifyPassword } = vi.hoisted(() => ({
  createSessionToken: vi.fn(),
  verifyPassword: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ createSessionToken, verifyPassword }));

import { createLegacyLoginAdapter } from "@/adapters/auth/legacy-login-adapter";

describe("createLegacyLoginAdapter", () => {
  it("keeps the existing auth helpers behind the port", () => {
    const previousSecret = process.env.AUTH_SECRET;
    const previousPassword = process.env.ADMIN_PASSWORD;
    process.env.AUTH_SECRET = "secret";
    process.env.ADMIN_PASSWORD = "password";
    verifyPassword.mockReturnValue(true);
    createSessionToken.mockReturnValue("token");
    const adapter = createLegacyLoginAdapter();
    expect(adapter.isConfigured()).toBe(true);
    expect(adapter.verifyPassword("password")).toBe(true);
    expect(adapter.createSessionToken()).toBe("token");
    if (previousSecret === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = previousSecret;
    if (previousPassword === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = previousPassword;
  });
});
