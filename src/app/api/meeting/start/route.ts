import { NextRequest, NextResponse } from "next/server";
import { createMeeting } from "@/lib/meeting-store";

// 開一場新會議，回傳 meeting id（前端接著用它送指令、結束時上傳錄音）。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title : undefined;
  const id = await createMeeting(title);
  if (!id) return NextResponse.json({ error: "無法建立會議" }, { status: 500 });
  return NextResponse.json({ id });
}
