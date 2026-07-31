import { NextRequest, NextResponse } from "next/server";
import { createLegacyVisitAiAdapter } from "@/adapters/visit/legacy-ai-adapter";
import { runDraftInviteEmail } from "@/modules/visit/ai-application";
import { parseDraftInviteEmailRequest } from "@/modules/visit/ai-rules";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = parseDraftInviteEmailRequest(body);
  if (parsed.kind === "invalid") return NextResponse.json({ error: parsed.message }, { status: 400 });
  const result = await runDraftInviteEmail(parsed.input, createLegacyVisitAiAdapter());
  if (result.kind === "error") return NextResponse.json({ error: result.message }, { status: 502 });
  return NextResponse.json({ draft: result.data });
}
