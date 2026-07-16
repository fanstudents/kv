import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = getSupabase();

  const { data, error } = await supabase.from("line_agents").select("*").eq("slug", slug).single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.enabled === "boolean") update.enabled = body.enabled;
  if (body.settings && typeof body.settings === "object") update.settings = body.settings;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("line_agents")
    .update(update)
    .eq("slug", slug)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
