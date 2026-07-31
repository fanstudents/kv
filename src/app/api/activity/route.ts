import { NextRequest, NextResponse } from "next/server";
import { createLegacyActivityReadAdapter } from "@/adapters/activity/legacy-read-adapter";
import { runActivityRead } from "@/modules/activity/read-application";
import { parseActivityReadRequest } from "@/modules/activity/read-rules";

export async function GET(req: NextRequest) {
  const result = await runActivityRead(
    parseActivityReadRequest(
      req.nextUrl.searchParams.get("status"),
      req.nextUrl.searchParams.get("limit"),
    ),
    createLegacyActivityReadAdapter(),
  );
  if (result.kind === "error") return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json(result.data);
}
