import { NextRequest, NextResponse } from "next/server";
import { createLegacyChecklistUpdateAdapter } from "@/adapters/checklist/legacy-update-adapter";
import { runChecklistUpdate } from "@/modules/checklist/update-application";
import { parseChecklistUpdateRequest } from "@/modules/checklist/update-rules";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const result = await runChecklistUpdate(
    parseChecklistUpdateRequest(id, body),
    createLegacyChecklistUpdateAdapter(),
  );
  if (result.kind === "error") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json(result.data);
}
