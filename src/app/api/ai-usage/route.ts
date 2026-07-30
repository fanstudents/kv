import { NextResponse } from "next/server";
import { createLegacyAiUsageReadAdapter } from "@/adapters/ai-usage/legacy-read-adapter";
import { runAiUsageRead } from "@/modules/ai-usage/read-application";

export async function GET() {
  const result = await runAiUsageRead(createLegacyAiUsageReadAdapter());
  if (result.kind === "query-failed") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json(result.report);
}
