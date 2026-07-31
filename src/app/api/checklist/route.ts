import { NextResponse } from "next/server";
import { createLegacyChecklistReadAdapter } from "@/adapters/checklist/legacy-read-adapter";
import { runChecklistRead } from "@/modules/checklist/read-application";

export async function GET() {
  const result = await runChecklistRead(createLegacyChecklistReadAdapter());
  if (result.kind === "error") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json(result.data);
}
