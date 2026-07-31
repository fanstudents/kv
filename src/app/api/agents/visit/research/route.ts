import { NextRequest, NextResponse } from "next/server";
import { createLegacyVisitResearchAdapter } from "@/adapters/visit/legacy-research-adapter";
import { runVisitResearch, runVisitResearchRead } from "@/modules/visit/research-application";
import { parseVisitResearchRequest } from "@/modules/visit/research-rules";

// 拜訪前的行前功課：GET 看最近幾份，POST 手動補做一份（平常是約成之後自動觸發）。
export const maxDuration = 120;

export async function GET() {
  return NextResponse.json(await runVisitResearchRead(createLegacyVisitResearchAdapter()));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = await runVisitResearch(parseVisitResearchRequest(body), createLegacyVisitResearchAdapter());
  if (result.kind === "invalid") return NextResponse.json({ error: result.message }, { status: 400 });
  if (result.kind === "error") return NextResponse.json({ error: result.message }, { status: 502 });
  return NextResponse.json(result.data);
}
