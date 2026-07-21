import { NextRequest, NextResponse } from "next/server";
import { getLiveTask } from "@/lib/live-task-store";

// 回傳目前這位 Agent 正在處理的實際圖片（例如剛上傳的名片照）位元組
export async function GET(req: NextRequest) {
  const agent = req.nextUrl.searchParams.get("agent") ?? "";
  const t = getLiveTask(agent);
  if (!t?.image) return new NextResponse(null, { status: 404 });

  const match = /^data:([^;]+);base64,([\s\S]*)$/.exec(t.image);
  if (!match) return new NextResponse(null, { status: 404 });

  const [, contentType, b64] = match;
  const buffer = Buffer.from(b64, "base64");
  return new NextResponse(buffer, {
    status: 200,
    headers: { "content-type": contentType, "cache-control": "no-store" },
  });
}
