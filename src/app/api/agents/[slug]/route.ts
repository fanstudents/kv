import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAgentAdminRepository } from "@/adapters/agents/supabase-agent-admin-repository";
import { readAgentInstance, updateAgentInstance } from "@/modules/agents/admin";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await readAgentInstance(slug, createSupabaseAgentAdminRepository());
  if (result.kind === "not-found") return NextResponse.json({ error: result.message }, { status: 404 });
  return NextResponse.json(result.data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));
  const result = await updateAgentInstance(slug, body, createSupabaseAgentAdminRepository());
  if (result.kind === "error") return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json(result.data);
}
