import "server-only";
import { getSupabase } from "./supabase";

// 視訊會議室的持久化：meetings（一場會議）＋ meeting_turns（會議中每一句）。
// 錄音檔存 Supabase Storage 的 meeting-recordings（私有）bucket，播放時才簽發 signed URL。

const RECORDING_BUCKET = "meeting-recordings";

export interface MeetingTurnInput {
  role: "boss" | "agent" | "teamlead";
  agentSlug?: string | null;
  speaker?: string | null;
  content: string;
}

/** 開一場新會議，回傳 meeting id。 */
export async function createMeeting(title?: string): Promise<string | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("meetings")
    .insert({ title: title ?? null })
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id as string;
}

/** 目前這場會議已有幾句（用來接續 turn_index）。 */
async function nextTurnIndex(meetingId: string): Promise<number> {
  const supabase = getSupabase();
  const { count } = await supabase
    .from("meeting_turns")
    .select("id", { count: "exact", head: true })
    .eq("meeting_id", meetingId);
  return count ?? 0;
}

/** 依序把老闆指令、各 Agent 回覆、Team Lead 統整寫進 meeting_turns。 */
export async function appendTurns(meetingId: string, turns: MeetingTurnInput[]): Promise<void> {
  if (turns.length === 0) return;
  const supabase = getSupabase();
  const base = await nextTurnIndex(meetingId);
  const rows = turns.map((t, i) => ({
    meeting_id: meetingId,
    turn_index: base + i,
    role: t.role,
    agent_slug: t.agentSlug ?? null,
    speaker: t.speaker ?? null,
    content: t.content,
  }));
  await supabase.from("meeting_turns").insert(rows);
}

/** 取最近幾句當作下一輪的脈絡，讓 AI 回應有連貫性。 */
export async function getRecentHistory(meetingId: string, limit = 6): Promise<string> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("meeting_turns")
    .select("role,speaker,content")
    .eq("meeting_id", meetingId)
    .order("turn_index", { ascending: false })
    .limit(limit);
  if (!data || data.length === 0) return "";
  return data
    .reverse()
    .map((t) => {
      const who = t.role === "boss" ? "老闆" : t.role === "teamlead" ? "Team Lead" : t.speaker || "同事";
      return `${who}：${t.content}`;
    })
    .join("\n");
}

/** 上傳錄音檔到 Storage，回傳存放路徑。 */
export async function uploadRecording(
  meetingId: string,
  bytes: ArrayBuffer,
  ext: string,
  contentType: string
): Promise<string | null> {
  const supabase = getSupabase();
  const path = `${meetingId}/recording.${ext}`;
  const { error } = await supabase.storage
    .from(RECORDING_BUCKET)
    .upload(path, bytes, { contentType, upsert: true });
  if (error) return null;
  return path;
}

/** 結束會議：補上逐字稿、時長、錄音路徑與 Team Lead 最新統整。 */
export async function finishMeeting(
  meetingId: string,
  fields: { transcript?: string; durationSeconds?: number; recordingPath?: string | null }
): Promise<void> {
  const supabase = getSupabase();

  // summary 取這場會議最後一次 Team Lead 統整
  const { data: lastLead } = await supabase
    .from("meeting_turns")
    .select("content")
    .eq("meeting_id", meetingId)
    .eq("role", "teamlead")
    .order("turn_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase
    .from("meetings")
    .update({
      ended_at: new Date().toISOString(),
      transcript: fields.transcript ?? null,
      duration_seconds: fields.durationSeconds ?? null,
      recording_path: fields.recordingPath ?? null,
      summary: lastLead?.content ?? null,
    })
    .eq("id", meetingId);
}

/** 簽發錄音檔的臨時可存取連結（預設 1 小時）。 */
export async function getSignedRecordingUrl(meetingId: string): Promise<string | null> {
  const supabase = getSupabase();
  const { data: meeting } = await supabase
    .from("meetings")
    .select("recording_path")
    .eq("id", meetingId)
    .maybeSingle();
  const path = meeting?.recording_path as string | undefined;
  if (!path) return null;
  const { data } = await supabase.storage.from(RECORDING_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
