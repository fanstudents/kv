import { NextRequest, NextResponse } from "next/server";
import { createLegacySubscribersBroadcastAdapter } from "@/adapters/subscribers/legacy-broadcast-adapter";
import { runSubscribersBroadcast, runSubscribersBroadcastRead } from "@/modules/subscribers/broadcast-application";
import { parseSubscribersBroadcastRequest } from "@/modules/subscribers/broadcast-rules";

export async function GET() {
  const result = await runSubscribersBroadcastRead(createLegacySubscribersBroadcastAdapter());
  if (result.kind === "error") return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json(result.data);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = parseSubscribersBroadcastRequest(body);
  if (parsed.kind === "invalid") return NextResponse.json({ error: parsed.message }, { status: 400 });
  const result = await runSubscribersBroadcast(parsed, createLegacySubscribersBroadcastAdapter());
  if (result.kind === "error") return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json(result.data);
}
