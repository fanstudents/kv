import { NextRequest } from "next/server";
import { runCronJob } from "@/lib/cron";
import { forgetExpired } from "@/lib/agent-memory";
import { requeueStaleTasks } from "@/lib/agent-tasks";

// 每日維護：把該忘的忘掉、把卡住的放回去。
//
// 遺忘不是可有可無的功能。記憶只寫不刪的系統會慢慢中毒：三個月前那位客戶的偏好、
// 早就改掉的價格、已經結案的專案，全部還在 prompt 裡跟現在的事實打架。
// 每條記憶寫進去時就帶 TTL，這支負責讓 TTL 真的生效。
//
// 同時把認領後卡住的委派放回佇列——worker 中途掛掉的話，那筆任務會永遠停在 claimed。
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  return runCronJob(req, { agentSlug: "operations", job: "maintenance", daily: true }, async () => {
    const forgotten = await forgetExpired();
    const requeued = await requeueStaleTasks(30);
    return {
      forgotten,
      requeued,
      message: `清掉 ${forgotten} 條過期記憶，${requeued} 筆卡住的委派放回佇列`,
    };
  });
}
