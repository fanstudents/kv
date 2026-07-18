import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

interface UsageRow {
  agent_slug: string | null;
  operation: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  created_at: string;
}

export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("ai_usage_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(2000);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const rows = (data ?? []) as UsageRow[];
  const now = Date.now();
  const cutoff30 = now - 30 * 24 * 60 * 60 * 1000;
  const cutoff7 = now - 7 * 24 * 60 * 60 * 1000;

  const sum = (list: UsageRow[]) => ({
    count: list.length,
    tokens: list.reduce((s, r) => s + (r.total_tokens ?? 0), 0),
    cost: list.reduce((s, r) => s + Number(r.cost_usd ?? 0), 0),
  });

  const recent30 = rows.filter((r) => new Date(r.created_at).getTime() >= cutoff30);
  const recent7 = rows.filter((r) => new Date(r.created_at).getTime() >= cutoff7);

  // 依操作彙總
  const byOperation = new Map<string, UsageRow[]>();
  for (const r of rows) {
    const list = byOperation.get(r.operation) ?? [];
    list.push(r);
    byOperation.set(r.operation, list);
  }
  const operations = [...byOperation.entries()]
    .map(([operation, list]) => ({ operation, model: list[0]?.model ?? "", ...sum(list) }))
    .sort((a, b) => b.cost - a.cost);

  // 依模型彙總
  const byModel = new Map<string, UsageRow[]>();
  for (const r of rows) {
    const list = byModel.get(r.model) ?? [];
    list.push(r);
    byModel.set(r.model, list);
  }
  const models = [...byModel.entries()]
    .map(([model, list]) => ({ model, ...sum(list) }))
    .sort((a, b) => b.cost - a.cost);

  return NextResponse.json({
    total: sum(rows),
    last30: sum(recent30),
    last7: sum(recent7),
    operations,
    models,
    recent: rows.slice(0, 50),
  });
}
