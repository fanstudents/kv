import "server-only";
import { createClient } from "@supabase/supabase-js";
import {
  readPipelineOverview,
  type PipelineOverview,
  type TeachingInquiryRow,
  type TeachingPipelineSnapshot,
  type TeachingPipelineSource,
  type TeachingProjectRow,
  type TeachingProjectSessionRow,
  type TeachingQuotationRow,
} from "@/modules/operations/pipeline";

type ReadOnlyTable<Row> = {
  Row: Row;
  Insert: never;
  Update: never;
  Relationships: [];
};

type TeachingDatabase = {
  public: {
    Tables: {
      projects: ReadOnlyTable<TeachingProjectRow>;
      project_sessions: ReadOnlyTable<TeachingProjectSessionRow>;
      enterprise_inquiries: ReadOnlyTable<TeachingInquiryRow>;
      quotations: ReadOnlyTable<TeachingQuotationRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};

interface TeachingQueryResult<Row> {
  data: Row[] | null;
  error: { message: string } | null;
}

export interface TeachingPipelineQueries {
  projects(signal: AbortSignal): Promise<TeachingQueryResult<TeachingProjectRow>>;
  sessions(signal: AbortSignal): Promise<TeachingQueryResult<TeachingProjectSessionRow>>;
  inquiries(signal: AbortSignal): Promise<TeachingQueryResult<TeachingInquiryRow>>;
  quotations(signal: AbortSignal): Promise<TeachingQueryResult<TeachingQuotationRow>>;
}

const QUERY_TIMEOUT_MS = 8_000;
let client: ReturnType<typeof createClient<TeachingDatabase>> | null = null;

function getTeachingSupabase() {
  if (client) return client;

  const url = process.env.TEACHING_SUPABASE_URL;
  const key = process.env.TEACHING_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing TEACHING_SUPABASE_URL / TEACHING_SUPABASE_ANON_KEY environment variables");
  }

  client = createClient<TeachingDatabase>(url, key, { auth: { persistSession: false } });
  return client;
}

const supabaseQueries: TeachingPipelineQueries = {
  projects: async (signal) =>
    await getTeachingSupabase()
      .from("projects")
      .select("id,name,type,organization,current_phase,created_at")
      .order("created_at", { ascending: false })
      .abortSignal(signal),
  sessions: async (signal) =>
    await getTeachingSupabase().from("project_sessions").select("project_id").abortSignal(signal),
  inquiries: async (signal) =>
    await getTeachingSupabase()
      .from("enterprise_inquiries")
      .select("id,name,company,status,created_at")
      .order("created_at", { ascending: false })
      .abortSignal(signal),
  quotations: async (signal) =>
    await getTeachingSupabase()
      .from("quotations")
      .select("id,title,client_name,total_amount,status,created_at")
      .order("created_at", { ascending: false })
      .abortSignal(signal),
};

function rowsOrThrow<Row>(table: string, result: TeachingQueryResult<Row>): Row[] {
  if (result.error) {
    throw new Error(`Teaching Supabase ${table} query failed: ${result.error.message}`);
  }
  return result.data ?? [];
}

/** 建立單一唯讀外部資料源；查詢任一失敗時整份快照視為不可用，避免回傳錯誤的零值。 */
export function createTeachingPipelineSource(
  queries: TeachingPipelineQueries,
  timeoutMs = QUERY_TIMEOUT_MS
): TeachingPipelineSource {
  return {
    async readSnapshot(): Promise<TeachingPipelineSnapshot> {
      const signal = AbortSignal.timeout(timeoutMs);
      const [projects, sessions, inquiries, quotations] = await Promise.all([
        queries.projects(signal),
        queries.sessions(signal),
        queries.inquiries(signal),
        queries.quotations(signal),
      ]);

      return {
        projects: rowsOrThrow("projects", projects),
        sessions: rowsOrThrow("project_sessions", sessions),
        inquiries: rowsOrThrow("enterprise_inquiries", inquiries),
        quotations: rowsOrThrow("quotations", quotations),
      };
    },
  };
}

export const teachingPipelineSource = createTeachingPipelineSource(supabaseQueries);

/** KV 的 composition seam：route 與會議脈絡共用同一份 Operations use case。 */
export function getPipelineOverview(): Promise<PipelineOverview> {
  return readPipelineOverview(teachingPipelineSource);
}
