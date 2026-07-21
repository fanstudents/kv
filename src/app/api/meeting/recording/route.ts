import { NextRequest, NextResponse } from "next/server";
import { getSignedRecordingUrl } from "@/lib/meeting-store";

// 回傳某場會議錄音檔的臨時可存取連結（signed URL），供回放／下載。
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  const url = await getSignedRecordingUrl(id);
  if (!url) return NextResponse.json({ error: "找不到錄音檔" }, { status: 404 });
  return NextResponse.json({ url });
}
