import { NextRequest, NextResponse } from "next/server";
import { createLegacyVisitResearchSource } from "@/adapters/visit/legacy-research-source";
import {
  parseVisitResearchRequest,
  runVisitResearch,
  runVisitResearchRead,
} from "@/modules/visit/research";

// 拜訪前的行前功課：GET 看最近幾份，POST 手動補做一份（平常是約成之後自動觸發）。
export const maxDuration = 120;

export async function GET() {
  return NextResponse.json(await runVisitResearchRead(createLegacyVisitResearchSource()));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = await runVisitResearch(parseVisitResearchRequest(body), createLegacyVisitResearchSource());
  if (result.kind === "invalid") return NextResponse.json({ error: result.message }, { status: 400 });
  if (result.kind === "error") return NextResponse.json({ error: result.message }, { status: 502 });
  return NextResponse.json(result.data);
}
