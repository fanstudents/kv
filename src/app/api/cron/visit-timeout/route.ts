import { NextRequest, NextResponse } from "next/server";
import { createLegacyConversationLockAdapter } from "@/adapters/conversation/legacy-lock-adapter";
import { supabaseOperationsRepository } from "@/adapters/operations/supabase-operations-repository";
import { createLiveTaskStateRepository } from "@/adapters/live-task/live-task-state-repository";
import { createLegacyVisitLineActivityAdapter } from "@/adapters/visit/legacy-line-activity-adapter";
import { createLegacyVisitLineDeliveryAdapter } from "@/adapters/visit/legacy-line-delivery-adapter";
import { createLegacyVisitLineWorkflowAdapter } from "@/adapters/visit/legacy-line-workflow-adapter";
import { parseCronAuth } from "@/modules/cron/auth-rules";
import { runVisitTimeoutApplication } from "@/modules/visit/timeout-application";

const conversationLockPort = createLegacyConversationLockAdapter();
const contactTagPort = supabaseOperationsRepository;
const lineDeliveryPort = createLegacyVisitLineDeliveryAdapter();
const lineWorkflowPort = createLegacyVisitLineWorkflowAdapter();

// 約拜訪逾時自動判斷：名片辨識後 3 分鐘還沒回「要／不要」→ 依設定「一律先略過」、
// 標記客戶「待跟進」存起來、通知使用者，不自動寄邀約。
// 由外部排程器每 1～2 分鐘呼叫一次（帶 x-cron-key）。
export async function GET(req: NextRequest) {
  // 一律要求密鑰（fail-closed）：以前是「有設定才驗證」，等於哪個環境漏設 CRON_SECRET，
  // 這支端點就對全世界開放——而它會觸發推播、爬蟲、燒 API 額度。
  const auth = parseCronAuth(process.env.CRON_SECRET, req.headers.get("x-cron-key"));
  if (auth.kind !== "authorized") return NextResponse.json({ error: auth.message }, { status: auth.status });

  const handled = await runVisitTimeoutApplication({
    workflow: lineWorkflowPort,
    tags: contactTagPort,
    activity: createLegacyVisitLineActivityAdapter(),
    liveTask: createLiveTaskStateRepository(),
    delivery: lineDeliveryPort,
    lock: conversationLockPort,
  });

  return NextResponse.json({ ok: true, handled });
}
