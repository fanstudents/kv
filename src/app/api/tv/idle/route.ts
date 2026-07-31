import { NextRequest, NextResponse } from "next/server";
import { createLegacyTvIdleAdapter } from "@/adapters/tv/legacy-idle-adapter";
import { createTvIdleApplication } from "@/modules/tv/idle-application";
import { parseTvIdleAgent } from "@/modules/tv/idle-rules";

// 劇院待命場景的真實資料：行程助理讀真行事曆、總管讀真團隊動態、約拜訪讀真標籤。
// 全部 best-effort：取不到就回 null，前端自動退回示意資料，畫面永不開天窗。

// 行事曆 API 有配額，加一層 10 分鐘的簡易快取（模組層，重啟即清空）
const tvIdle = createTvIdleApplication(createLegacyTvIdleAdapter());

export async function GET(req: NextRequest) {
  const agent = parseTvIdleAgent(req.nextUrl.searchParams.get("agent"));

  try {
    const result = await tvIdle.run(agent);
    if (result.kind === "unknown") return NextResponse.json({ ok: false, error: "unknown agent" }, { status: 400 });
    if (result.kind === "schedule") {
      return NextResponse.json({ ok: true, data: result.data, ...(result.cached ? { cached: true } : {}) });
    }
    return NextResponse.json({ ok: true, data: result.data });
  } catch {
    // 任何來源失敗（如 Google 憑證未設）都回 null，讓前端用示意資料
    return NextResponse.json({ ok: false, data: null });
  }
}
