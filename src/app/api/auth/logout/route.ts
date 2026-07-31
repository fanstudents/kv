import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { runLogout } from "@/modules/auth/logout-application";

export async function POST() {
  const result = runLogout(process.env.NODE_ENV === "production");
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, result.cookie.value, result.cookie);
  return res;
}
