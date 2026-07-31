import { NextRequest, NextResponse } from "next/server";
import { supabaseOperationsRepository } from "@/adapters/operations/supabase-operations-repository";
import { createOperationsService, parseActivityReadRequest } from "@/modules/operations/service";

const operations = createOperationsService(supabaseOperationsRepository);

export async function GET(req: NextRequest) {
  const result = await operations.readActivity(
    parseActivityReadRequest(
      req.nextUrl.searchParams.get("status"),
      req.nextUrl.searchParams.get("limit"),
    ),
  );
  if (result.kind === "error") return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json(result.data);
}
