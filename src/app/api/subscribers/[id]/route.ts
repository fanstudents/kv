import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const update: Record<string, unknown> = {};
  if (Array.isArray(body.tags)) update.tags = body.tags.filter((t: unknown) => typeof t === "string" && t.trim());
  if (typeof body.note === "string") update.note = body.note;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "沒有可更新的欄位" }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.from("line_subscribers").update(update).eq("id", id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
