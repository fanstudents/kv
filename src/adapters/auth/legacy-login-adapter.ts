import "server-only";
import { createSessionToken, verifyPassword } from "@/lib/auth";
import type { LoginPort } from "@/modules/auth/login-ports";

export function createLegacyLoginAdapter(): LoginPort {
  return {
    isConfigured: () => Boolean(process.env.AUTH_SECRET && process.env.ADMIN_PASSWORD),
    verifyPassword,
    createSessionToken,
  };
}
