import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";
import { createLegacyLoginAdapter } from "@/adapters/auth/legacy-login-adapter";
import { runLogin } from "@/modules/auth/login-application";
import { parseLoginRequest } from "@/modules/auth/login-rules";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = runLogin(parseLoginRequest(body), createLegacyLoginAdapter());
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
