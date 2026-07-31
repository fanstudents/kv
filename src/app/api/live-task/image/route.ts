import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getLiveImage } from "@/lib/live-task-store";

// 回傳目前這位 Agent 正在處理的實際圖片（例如剛上傳的名片照）位元組。
// LINE 傳來的照片常常只帶著 EXIF Orientation 標記（畫素本身是相機原始方向），
// 前端 <img> 沒有另外處理旋轉，直接顯示就會歪斜/被截掉一角——
// 這裡用 sharp().rotate() 依 EXIF 把畫素轉正再輸出，順便讓 EXIF 消失，不會轉兩次。
export async function GET(req: NextRequest) {
  const agent = req.nextUrl.searchParams.get("agent") ?? "";
  const image = await getLiveImage(agent);
  if (!image) return new NextResponse(null, { status: 404 });

  const match = /^data:([^;]+);base64,([\s\S]*)$/.exec(image);
  if (!match) return new NextResponse(null, { status: 404 });

  const [, contentType, b64] = match;
  const rawBuffer = Buffer.from(b64, "base64");

  let buffer = rawBuffer;
  if (contentType.startsWith("image/") && contentType !== "image/svg+xml") {
    try {
      buffer = await sharp(rawBuffer).rotate().toBuffer();
    } catch {
      buffer = rawBuffer;
    }
  }

  return new NextResponse(buffer, {
    status: 200,
    headers: { "content-type": contentType, "cache-control": "no-store" },
  });
}
