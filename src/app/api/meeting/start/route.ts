import { NextRequest, NextResponse } from "next/server";
import { createMeeting, meetingRunId } from "@/lib/meeting-store";

// 開一場新會議，回傳 meeting id（前端接著用它送指令、結束時上傳錄音）。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title : undefined;
  const id = await createMeeting(title);
  if (!id) return NextResponse.json({ error: "無法建立會議" }, { status: 500 });

  // 同時開一次執行，這場會議後續的語音成本才有地方歸屬
  await meetingRunId(id);

  return NextResponse.json({ id });
}
