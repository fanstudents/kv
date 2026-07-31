import { NextResponse } from "next/server";
import { createSupabaseAiUsageRepository } from "@/adapters/ai-usage/supabase-ai-usage-repository";
import { readAiUsage } from "@/modules/ai-usage/usage";

export async function GET() {
  const result = await readAiUsage(createSupabaseAiUsageRepository());
  if (result.kind === "query-failed") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json(result.report);
}
