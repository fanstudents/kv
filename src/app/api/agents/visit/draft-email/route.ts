import { NextRequest, NextResponse } from "next/server";
import { createLegacyVisitAiDependencies } from "@/adapters/visit/legacy-ai-dependencies";
import { parseDraftInviteEmailRequest, runDraftInviteEmail } from "@/modules/visit/ai";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = parseDraftInviteEmailRequest(body);
  if (parsed.kind === "invalid") return NextResponse.json({ error: parsed.message }, { status: 400 });
  const result = await runDraftInviteEmail(parsed.input, createLegacyVisitAiDependencies());
  if (result.kind === "error") return NextResponse.json({ error: result.message }, { status: 502 });
  return NextResponse.json({ draft: result.data });
}
