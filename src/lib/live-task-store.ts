import "server-only";
import { getSupabase } from "./supabase";

// 劇院模式「真實現正處理」的即時狀態，持久化在 Supabase（agent_live_task 表）。
// webhook 於名片流程各里程碑寫入，/tv 讀取。重啟、多實例都不受影響。

const TTL_MS = 120_000; // 兩分鐘沒更新就視為結束，畫面回到「待命中」

export type LiveStatus = "active" | "waiting" | "done";

export interface LiveTaskState {
  agentSlug: string;
  step: number;
  status: LiveStatus;
  caption: string | null;
  hasImage: boolean;
  imageVersion: number;
  updatedAt: number;
}

type Patch = { step?: number; status?: LiveStatus; caption?: string; image?: string };

/** 寫入／更新某 Agent 的即時狀態（缺省欄位沿用上一筆）。best-effort，永不丟例外。 */
export async function setLiveTask(agentSlug: string, patch: Patch): Promise<void> {
  try {
    const supabase = getSupabase();
    const { data: prev } = await supabase
      .from("agent_live_task")
      .select("step,status,caption,image,image_version")
      .eq("agent_slug", agentSlug)
      .maybeSingle();

    const imageChanged = patch.image !== undefined && patch.image !== prev?.image;
    await supabase.from("agent_live_task").upsert(
      {
        agent_slug: agentSlug,
        step: patch.step ?? prev?.step ?? 0,
        status: patch.status ?? prev?.status ?? "active",
        caption: patch.caption ?? prev?.caption ?? null,
        image: patch.image ?? prev?.image ?? null,
        image_version: imageChanged ? Date.now() : (prev?.image_version ?? 0),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "agent_slug" }
    );
  } catch {
    // UI 狀態寫入失敗不應影響主流程（名片辨識、寄信等照常）
  }
}

/** 讀取狀態（不含圖片本體）；超過 TTL 未更新視為「待命中」回傳 null。 */
export async function getLiveTaskState(agentSlug: string): Promise<LiveTaskState | null> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("agent_live_task")
      .select("step,status,caption,image_version,updated_at")
      .eq("agent_slug", agentSlug)
      .maybeSingle();
    if (!data) return null;
    const updatedAt = new Date(data.updated_at).getTime();
    if (Date.now() - updatedAt > TTL_MS) return null;
    return {
      agentSlug,
      step: data.step ?? 0,
      status: data.status === "done" ? "done" : data.status === "waiting" ? "waiting" : "active",
      caption: data.caption ?? null,
      hasImage: (data.image_version ?? 0) > 0,
      imageVersion: data.image_version ?? 0,
      updatedAt,
    };
  } catch {
    return null;
  }
}

/** 讀取目前處理中的實際圖片（data URL）。 */
export async function getLiveImage(agentSlug: string): Promise<string | null> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("agent_live_task")
      .select("image")
      .eq("agent_slug", agentSlug)
      .maybeSingle();
    return (data?.image as string | null) ?? null;
  } catch {
    return null;
  }
}
