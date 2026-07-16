import { NextRequest, NextResponse } from "next/server";
import { verifyLineSignature, replyLineMessage } from "@/lib/line";

export async function GET() {
  return NextResponse.json({ ok: true, service: "line-agent-console webhook" });
}

interface LineEvent {
  type: string;
  replyToken?: string;
  message?: { type: string; text?: string };
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature");

  if (!verifyLineSignature(rawBody, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let events: LineEvent[] = [];
  try {
    events = JSON.parse(rawBody).events ?? [];
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  await Promise.allSettled(
    events.map(async (event) => {
      if (event.type === "message" && event.message?.type === "text" && event.replyToken) {
        await replyLineMessage(
          event.replyToken,
          "已收到您的訊息，這裡是 LINE Agent 控制台的測試回覆。"
        );
      }
    })
  );

  return NextResponse.json({ ok: true });
}
