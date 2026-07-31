import { NextRequest, NextResponse } from "next/server";
import { createLegacyAgentInstanceReadAdapter } from "@/adapters/agents/legacy-agent-instance-read-adapter";
import { createLegacyAgentInstanceUpdateAdapter } from "@/adapters/agents/legacy-agent-instance-update-adapter";
import { runAgentInstanceRead } from "@/modules/agents/agent-instance-read-application";
import { runAgentInstanceUpdate } from "@/modules/agents/agent-instance-update-application";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await runAgentInstanceRead(slug, createLegacyAgentInstanceReadAdapter());
  if (result.kind === "not-found") return NextResponse.json({ error: result.message }, { status: 404 });
  return NextResponse.json(result.data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));
  const result = await runAgentInstanceUpdate(slug, body, createLegacyAgentInstanceUpdateAdapter());
  if (result.kind === "error") return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json(result.data);
}
