import { NextRequest, NextResponse } from "next/server";
import { supabaseChecklistRepository } from "@/adapters/checklist/supabase-checklist-repository";
import { createChecklistService, parseChecklistUpdateRequest } from "@/modules/checklist/service";

const checklist = createChecklistService(supabaseChecklistRepository);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const result = await checklist.update(parseChecklistUpdateRequest(id, body));
  if (result.kind === "error") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json(result.data);
}
