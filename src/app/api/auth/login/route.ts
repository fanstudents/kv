import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE, verifyPassword } from "@/lib/auth";
import { parseLoginRequest, runLogin } from "@/modules/auth/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = runLogin(parseLoginRequest(body), {
    isConfigured: () => Boolean(process.env.AUTH_SECRET && process.env.ADMIN_PASSWORD),
    verifyPassword,
    createSessionToken,
  });
  if (result.kind === "config-error") {
    return NextResponse.json({ error: result.message }, { status: 500 });
  }
  if (result.kind === "invalid-password") {
    return NextResponse.json({ error: result.message }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
