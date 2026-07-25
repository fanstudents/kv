import "server-only";
import { getSupabase } from "./supabase";
import { levelInfo, type KnowledgeLevel } from "./knowledge-base-data";
import type { AgentSlug } from "./types";

// Agent 的記憶層（agent_memory）與目標指標的時間序列（metric_snapshots）。
//
// 記憶分三種：
//   episodic   做過什麼、結果如何（從 agent_runs 沉澱）
//   semantic   學到的事實（「週四 CPA 會飆」「這組字群點擊成長最快」）
//   preference 對象的偏好（「這位客戶只在下午回信」）
// 記憶跟知識庫共用同一套 L1-L4 分級：一位 Agent 只讀得到自己等級以內的記憶，
// 而且每條記憶都有 TTL 與可信度——沒有遺忘機制的記憶系統會慢慢中毒。

export type MemoryScope = "agent" | "team";
export type MemoryKind = "episodic" | "semantic" | "preference";

export interface MemoryRow {
  id: string;
  scope: MemoryScope;
  agent_slug: string | null;
  kind: MemoryKind;
  content: string;
  level: KnowledgeLevel;
  confidence: number;
  created_at: string;
  expires_at: string | null;
}

/** 記一件事。team scope 代表全隊共用（例如 Team Lead 的晨報結論） */
export async function remember(params: {
  content: string;
  scope?: MemoryScope;
  agentSlug?: AgentSlug;
  kind?: MemoryKind;
  level?: KnowledgeLevel;
  confidence?: number;
  sourceRunId?: string | null;
  /** 幾天後過期；不給就永久保留（semantic 建議給，episodic 一定要給） */
  ttlDays?: number;
}): Promise<void> {
  try {
    const expires =
      params.ttlDays === undefined
        ? null
        : new Date(Date.now() + params.ttlDays * 86400000).toISOString();
    await getSupabase()
      .from("agent_memory")
      .insert({
        scope: params.scope ?? "agent",
        agent_slug: params.agentSlug ?? null,
        kind: params.kind ?? "episodic",
        content: params.content,
        level: params.level ?? 2,
        confidence: params.confidence ?? 0.6,
        source_run_id: params.sourceRunId ?? null,
        expires_at: expires,
      });
  } catch {
    /* best-effort */
  }
}

/**
 * 取這位 Agent 現在能用的記憶：自己的 + 團隊共用的，只到他的知識庫讀取上限，
 * 過期的自動排除。回傳字串可直接接到 getAgentLiveContext() 後面塞進 prompt。
 */
export async function recall(params: {
  agentSlug: AgentSlug;
  maxLevel: KnowledgeLevel;
  limit?: number;
  kinds?: MemoryKind[];
}): Promise<MemoryRow[]> {
  try {
    let query = getSupabase()
      .from("agent_memory")
      .select("id,scope,agent_slug,kind,content,level,confidence,created_at,expires_at")
      .lte("level", params.maxLevel)
      .or(`agent_slug.eq.${params.agentSlug},scope.eq.team`)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false })
      .limit(params.limit ?? 12);

    if (params.kinds?.length) query = query.in("kind", params.kinds);

    const { data } = await query;
    return (data ?? []) as MemoryRow[];
  } catch {
    return [];
  }
}

/** 把記憶排成一段可以塞進 prompt 的文字 */
export function memoryContext(rows: MemoryRow[]): string {
  if (rows.length === 0) return "";
  const label: Record<MemoryKind, string> = {
    episodic: "做過",
    semantic: "學到",
    preference: "偏好",
  };
  return [
    "你記得的事（越前面越新，括號是敏感度分級）：",
    ...rows.map((r) => `- [${label[r.kind]}｜${levelInfo(r.level).label}] ${r.content}`),
  ].join("\n");
}

/** 清掉過期記憶（可掛在每日 cron） */
export async function forgetExpired(): Promise<number> {
  try {
    const { data } = await getSupabase()
      .from("agent_memory")
      .delete()
      .lt("expires_at", new Date().toISOString())
      .select("id");
    return data?.length ?? 0;
  } catch {
    return 0;
  }
}

// ── 目標指標的每日快照 ──────────────────────────────────────
// 有了快照，達成率才從「現在幾分」變成「一條走勢」：可以畫趨勢、算達標日、
// 也才分得出這是 Agent 做出來的還是自然波動（跟基準線比）。

/** 寫入某個指標今天的值（同一天同指標只留一筆，重跑會覆蓋） */
export async function snapshotMetric(params: {
  metricId: string;
  value: number;
  source?: string;
  capturedAt?: Date;
}): Promise<void> {
  try {
    const captured = (params.capturedAt ?? new Date()).toISOString();
    await getSupabase().from("metric_snapshots").upsert(
      {
        metric_id: params.metricId,
        value: params.value,
        source: params.source ?? "manual",
        captured_at: captured,
      },
      // captured_on 是由 captured_at 推出來的 generated column（UTC 日期），
      // 同一天同指標重跑會覆蓋、不會長出第二筆
      { onConflict: "metric_id,captured_on" }
    );
  } catch {
    /* best-effort */
  }
}

export interface SnapshotRow {
  metric_id: string;
  value: number;
  captured_at: string;
}

/** 某個指標近 N 天的走勢（給目標頁畫趨勢線／算預估達標日） */
export async function metricHistory(metricId: string, days = 30): Promise<SnapshotRow[]> {
  try {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const { data } = await getSupabase()
      .from("metric_snapshots")
      .select("metric_id,value,captured_at")
      .eq("metric_id", metricId)
      .gte("captured_at", since)
      .order("captured_at", { ascending: true });
    return (data ?? []) as SnapshotRow[];
  } catch {
    return [];
  }
}
