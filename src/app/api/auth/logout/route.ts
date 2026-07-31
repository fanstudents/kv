import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { buildLogoutCookiePolicy } from "@/modules/auth/auth";

export async function POST() {
  const cookie = buildLogoutCookiePolicy(process.env.NODE_ENV === "production");
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, cookie.value, cookie);
  return res;
}
