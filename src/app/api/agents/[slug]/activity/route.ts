import { NextRequest, NextResponse } from "next/server";
import { supabaseOperationsRepository } from "@/adapters/operations/supabase-operations-repository";
import { createOperationsService, parseAgentActivityReadRequest } from "@/modules/operations/service";

const operations = createOperationsService(supabaseOperationsRepository);

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await operations.readActivity(parseAgentActivityReadRequest(slug));
  if (result.kind === "error") return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json(result.data);
}
