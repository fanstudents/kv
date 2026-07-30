import { NextRequest, NextResponse } from "next/server";
import { createLegacyMeetingFinishAdapter } from "@/adapters/meeting/legacy-finish-adapter";
import { runMeetingFinish } from "@/modules/meeting/finish-application";
import { parseMeetingFinishForm } from "@/modules/meeting/finish-rules";

// 結束會議：上傳整場錄音（multipart）到 Storage，並補上逐字稿、時長與統整。
export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "需要 multipart/form-data" }, { status: 400 });
  }

  const result = await runMeetingFinish(
    parseMeetingFinishForm(form),
    createLegacyMeetingFinishAdapter()
  );
  if (result.kind === "invalid") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true, recordingSaved: result.recordingSaved });
}
