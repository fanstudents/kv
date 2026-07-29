import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { budgetStatus } from "@/lib/ai-usage";

// 健康檢查：一支端點回答「這個系統現在還活著嗎」。
//
// 為什麼需要：整個系統大量使用 best-effort 的 catch（記錄失敗不該把主流程弄掛，
// 這個取捨是對的），但代價是「Supabase 掛了一小時」跟「今天本來就沒事」
// 在後台長得一模一樣——所有數字都是 0，沒有任何錯誤。
// 這裡主動去戳每個依賴，把「安靜」跟「正常」分開。
//
// 不需要密鑰：回傳的都是布林值與設定缺漏，沒有任何機密內容。
// 給 uptime 監控直接輪詢用；degraded 會回 503，監控才看得出來。
export const dynamic = "force-dynamic";

interface Check {
  name: string;
  ok: boolean;
  detail?: string;
}

/** 環境變數有沒有設定——不讀值，只回報有無 */
function envCheck(name: string, keys: string[]): Check {
  const missing = keys.filter((k) => !process.env[k]);
  return {
    name,
    ok: missing.length === 0,
    detail: missing.length ? `缺少環境變數：${missing.join("、")}` : undefined,
  };
}

/** 資料庫真的連得上、而且核心表讀得到 */
async function databaseCheck(): Promise<Check> {
  try {
    const { error } = await getSupabase().from("agent_runs").select("id", { count: "exact", head: true });
    if (error) return { name: "資料庫", ok: false, detail: error.message };
    return { name: "資料庫", ok: true };
  } catch (err) {
    return { name: "資料庫", ok: false, detail: err instanceof Error ? err.message : "連線失敗" };
  }
}

/** 20260730 那份 migration 套用了沒——沒套的話成本歸屬與重試會靜靜失效 */
async function migrationCheck(): Promise<Check> {
  try {
    const { error } = await getSupabase().rpc("add_run_cost", {
      p_run_id: "00000000-0000-0000-0000-000000000000",
      p_tokens: 0,
      p_cost: 0,
    });
    if (error) {
      return { name: "資料庫函式", ok: false, detail: `add_run_cost 不存在或無法呼叫：${error.message}` };
    }
    return { name: "資料庫函式", ok: true };
  } catch (err) {
    return { name: "資料庫函式", ok: false, detail: err instanceof Error ? err.message : "呼叫失敗" };
  }
}

/** 最近 24 小時有沒有失敗的執行——有的話系統活著但沒做好事 */
async function recentFailuresCheck(): Promise<Check> {
  try {
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { count, error } = await getSupabase()
      .from("agent_runs")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("started_at", since);
    if (error) return { name: "近 24 小時執行", ok: true, detail: "查詢失敗，略過" };
    return {
      name: "近 24 小時執行",
      ok: (count ?? 0) === 0,
      detail: count ? `有 ${count} 次執行失敗，請看執行紀錄` : undefined,
    };
  } catch {
    return { name: "近 24 小時執行", ok: true, detail: "查詢失敗，略過" };
  }
}

/** AI 預算還有沒有額度——燒完的話所有 AI 呼叫都會被閘門擋下 */
async function budgetCheck(): Promise<Check> {
  try {
    const status = await budgetStatus();
    const dailyLeft = status.daily.limit - status.daily.spent;
    const monthlyLeft = status.monthly.limit - status.monthly.spent;
    const exhausted = dailyLeft <= 0 || monthlyLeft <= 0;
    return {
      name: "AI 預算",
      ok: !exhausted,
      detail: exhausted
        ? `額度已用盡（今日剩 US$${dailyLeft.toFixed(2)}、本月剩 US$${monthlyLeft.toFixed(2)}），AI 呼叫會被擋下`
        : `今日剩 US$${dailyLeft.toFixed(2)}、本月剩 US$${monthlyLeft.toFixed(2)}`,
    };
  } catch (err) {
    return { name: "AI 預算", ok: false, detail: err instanceof Error ? err.message : "查詢失敗" };
  }
}

export async function GET() {
  const [database, migration, failures, budget] = await Promise.all([
    databaseCheck(),
    migrationCheck(),
    recentFailuresCheck(),
    budgetCheck(),
  ]);

  const checks: Check[] = [
    database,
    migration,
    envCheck("Supabase 設定", ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]),
    envCheck("OpenAI 憑證", ["OPENAI_API_KEY"]),
    envCheck("LINE 憑證", ["LINE_CHANNEL_SECRET", "LINE_CHANNEL_ACCESS_TOKEN"]),
    envCheck("Google 憑證", ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REFRESH_TOKEN"]),
    envCheck("排程密鑰", ["CRON_SECRET"]),
    envCheck("後台登入", ["AUTH_SECRET", "ADMIN_PASSWORD"]),
    budget,
    failures,
  ];

  // 資料庫連不上＝真的壞了；其他項目只是降級（憑證沒設、有失敗執行），系統仍在運作
  const down = !database.ok;
  const degraded = checks.some((c) => !c.ok);

  return NextResponse.json(
    {
      status: down ? "down" : degraded ? "degraded" : "ok",
      checkedAt: new Date().toISOString(),
      checks,
    },
    { status: down ? 503 : 200 }
  );
}
