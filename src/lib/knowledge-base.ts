import "server-only";
import { getSupabase } from "@/lib/supabase";
import { AGENTS } from "@/lib/agent-data";
import { levelInfo, type KnowledgeDoc, type KnowledgeLevel } from "@/lib/knowledge-base-data";
import type { AgentSlug } from "@/lib/types";

// 知識庫的「真實資料」層：文件與 Agent 讀取權限存在 Supabase（knowledge_base／
// knowledge_access 表），/knowledge-base 頁面編輯的就是這兩張表。knowledgeContext()
// 是實際接進 Agent 對話的地方——依 Agent 被指派的等級過濾文件，只把等級內的
// 內容塞進真實業務資料，示範資料分級不是裝飾用的 UI，而是真的會影響 Agent 答得出什麼。

export async function listKnowledgeDocs(): Promise<KnowledgeDoc[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("knowledge_base")
    .select("id,title,category,level,content,builtin")
    .order("level", { ascending: true })
    .order("created_at", { ascending: true });
  return (data ?? []) as KnowledgeDoc[];
}

export async function addKnowledgeDoc(doc: {
  title: string;
  category: string;
  level: KnowledgeLevel;
  content?: string;
}): Promise<KnowledgeDoc> {
  const supabase = getSupabase();
  const row = { id: `custom-${Date.now()}`, builtin: false, ...doc };
  const { error } = await supabase.from("knowledge_base").insert(row);
  if (error) throw new Error(error.message);
  return row as KnowledgeDoc;
}

export async function removeKnowledgeDoc(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("knowledge_base").delete().eq("id", id).eq("builtin", false);
  if (error) throw new Error(error.message);
}

export async function listAgentAccess(): Promise<Record<AgentSlug, KnowledgeLevel>> {
  const supabase = getSupabase();
  const { data } = await supabase.from("knowledge_access").select("agent_slug,max_level");
  const access = {} as Record<AgentSlug, KnowledgeLevel>;
  for (const row of data ?? []) {
    access[row.agent_slug as AgentSlug] = row.max_level as KnowledgeLevel;
  }
  for (const agent of AGENTS) {
    if (!(agent.slug in access)) access[agent.slug] = 1;
  }
  return access;
}

export async function setAgentAccess(slug: AgentSlug, level: KnowledgeLevel): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("knowledge_access")
    .upsert({ agent_slug: slug, max_level: level, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

async function getAgentMaxLevel(slug: string): Promise<KnowledgeLevel> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("knowledge_access")
    .select("max_level")
    .eq("agent_slug", slug)
    .maybeSingle();
  return (data?.max_level as KnowledgeLevel) ?? 1;
}

/** 塞進 getAgentLiveContext()：依這位 Agent 的可讀取上限,只把等級內的知識庫文件內容給他。 */
export async function knowledgeContext(slug: string): Promise<string> {
  const maxLevel = await getAgentMaxLevel(slug);
  const docs = await listKnowledgeDocs();
  const readable = docs.filter((d) => d.level <= maxLevel);
  const withheld = docs.length - readable.length;

  if (readable.length === 0) return "";

  const parts: string[] = [];
  parts.push(
    `你的知識庫讀取權限上限為 ${levelInfo(maxLevel).label}，以下是你能讀到的文件：\n` +
      readable.map((d) => `- 【${levelInfo(d.level).label}】${d.title}：${d.content ?? "（無內容摘要）"}`).join("\n")
  );
  if (withheld > 0) {
    parts.push(`另有 ${withheld} 份文件因等級高於你的讀取權限，未提供內容——如被問起，請照實說明無法讀取，不要編造。`);
  }
  return parts.join("\n");
}
