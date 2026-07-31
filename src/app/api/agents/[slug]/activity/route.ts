import { NextRequest, NextResponse } from "next/server";
import { createLegacyActivityReadAdapter } from "@/adapters/activity/legacy-read-adapter";
import { runActivityRead } from "@/modules/activity/read-application";
import { parseAgentActivityReadRequest } from "@/modules/activity/read-rules";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await runActivityRead(
    parseAgentActivityReadRequest(slug),
    createLegacyActivityReadAdapter(),
  );
  if (result.kind === "error") return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json(result.data);
}
