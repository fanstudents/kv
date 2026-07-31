import { NextResponse } from "next/server";
import { supabaseOperationsRepository } from "@/adapters/operations/supabase-operations-repository";
import { createOperationsService } from "@/modules/operations/service";

const operations = createOperationsService(supabaseOperationsRepository);

export async function GET() {
  const result = await operations.readContacts();
  if (result.kind === "error") return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json(result.data);
}
