import { NextResponse } from "next/server";
import { getRuntimeReadiness } from "@/lib/runtime-info";

export const dynamic = "force-dynamic";

/** Readiness/configuration signal; it does not call external providers or the database. */
export async function GET() {
  const readiness = getRuntimeReadiness();
  return NextResponse.json(readiness, {
    status: readiness.status === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
