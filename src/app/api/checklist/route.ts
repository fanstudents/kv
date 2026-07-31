import { NextResponse } from "next/server";
import { supabaseChecklistRepository } from "@/adapters/checklist/supabase-checklist-repository";
import { createChecklistService } from "@/modules/checklist/service";

const checklist = createChecklistService(supabaseChecklistRepository);

export async function GET() {
  const result = await checklist.read();
  if (result.kind === "error") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json(result.data);
}
