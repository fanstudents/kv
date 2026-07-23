import { NextRequest, NextResponse } from "next/server";
import { setAgentAccess } from "@/lib/knowledge-base";
import { AGENTS } from "@/lib/agent-data";
import type { AgentSlug } from "@/lib/types";

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const agentSlug = body.agentSlug as AgentSlug;
  const level = Number(body.level);

  if (!AGENTS.some((a) => a.slug === agentSlug) || ![1, 2, 3, 4].includes(level)) {
    return NextResponse.json({ error: "agentSlug 或 level 不合法" }, { status: 400 });
  }

  await setAgentAccess(agentSlug, level as 1 | 2 | 3 | 4);
  return NextResponse.json({ ok: true });
}
