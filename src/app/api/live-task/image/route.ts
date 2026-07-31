import { NextRequest, NextResponse } from "next/server";
import { createLiveTaskStateRepository } from "@/adapters/live-task/live-task-state-repository";
import { parseLiveTaskImageRequest, readLiveTaskImage } from "@/modules/live-task/state";

// 回傳目前這位 Agent 正在處理的實際圖片（例如剛上傳的名片照）位元組
export async function GET(req: NextRequest) {
  const result = await readLiveTaskImage(
    parseLiveTaskImageRequest(req.nextUrl.searchParams.get("agent")),
    createLiveTaskStateRepository(),
  );
  if (result.kind === "not-found") return new NextResponse(null, { status: 404 });

  const buffer = Buffer.from(result.base64, "base64");
  return new NextResponse(buffer, {
    status: 200,
    headers: { "content-type": result.contentType, "cache-control": "no-store" },
  });
}
