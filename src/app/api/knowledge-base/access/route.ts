import { NextRequest, NextResponse } from "next/server";
import { AGENTS } from "@/lib/agent-data";
import { createLegacyKnowledgeAccessUpdateAdapter } from "@/adapters/knowledge-base/legacy-access-update-adapter";
import { runKnowledgeAccessUpdate } from "@/modules/knowledge-base/access-application";
import { parseKnowledgeAccessUpdateRequest } from "@/modules/knowledge-base/access-rules";

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = await runKnowledgeAccessUpdate(
    parseKnowledgeAccessUpdateRequest(body, AGENTS),
    createLegacyKnowledgeAccessUpdateAdapter(),
  );
  if (result.kind === "invalid") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
