import { NextRequest, NextResponse } from "next/server";
import { AGENTS } from "@/lib/agent-data";
import { supabaseKnowledgeRepository } from "@/adapters/knowledge-base/supabase-knowledge-adapters";
import { parseKnowledgeAccessUpdate, updateKnowledgeAccess } from "@/modules/knowledge-base/access-policy";

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = await updateKnowledgeAccess(
    parseKnowledgeAccessUpdate(body, AGENTS),
    supabaseKnowledgeRepository,
  );
  if (result.kind === "invalid") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
