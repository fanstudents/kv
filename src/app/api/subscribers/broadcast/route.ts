import { NextRequest, NextResponse } from "next/server";
import { createLineSubscribersBroadcastAdapter } from "@/adapters/subscribers/line-broadcast-adapter";
import {
  parseSubscribersBroadcastRequest,
  runSubscribersBroadcast,
  runSubscribersBroadcastRead,
} from "@/modules/subscribers/broadcast";

export async function GET() {
  const result = await runSubscribersBroadcastRead(createLineSubscribersBroadcastAdapter());
  if (result.kind === "error") return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json(result.data);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = parseSubscribersBroadcastRequest(body);
  if (parsed.kind === "invalid") return NextResponse.json({ error: parsed.message }, { status: 400 });
  const result = await runSubscribersBroadcast(parsed, createLineSubscribersBroadcastAdapter());
  if (result.kind === "error") return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json(result.data);
}
