import "server-only";
import { createClient } from "@supabase/supabase-js";

// 「教學系統」是另一個獨立的 Supabase 專案（企業內訓／公開課程排課系統），
// 跟這個控制台主要在用的 Supabase 專案是分開的兩個資料庫。這裡只做唯讀查詢，
// 用來把真實的企業內訓／學校邀課／企業顧問洽詢／報價單彙整進營運 Agent 的儀表板。

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: ReturnType<typeof createClient<any>> | null = null;

function getTeachingSupabase() {
  if (client) return client;
  const url = process.env.TEACHING_SUPABASE_URL;
  const key = process.env.TEACHING_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing TEACHING_SUPABASE_URL / TEACHING_SUPABASE_ANON_KEY environment variables");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client = createClient<any>(url, key, { auth: { persistSession: false } });
  return client;
}

export interface PipelineProject {
  id: string;
  name: string;
  type: string;
  /** 給畫面顯示用的中文類型標籤（教學系統資料庫存的是英文代碼，例如 "corporate"／"course"） */
  typeLabel: string;
  organization: string;
  currentPhase: string | null;
  sessionCount: number;
  closed: boolean;
  createdAt: string | null;
}

// 教學系統的 projects.type 欄位存的是英文代碼，不是中文顯示字串——這裡統一判斷、
// 統一給顯示用的中文標籤，企業內訓／公開課程的統計跟趨勢圖都靠這組函式，不要各自比對字串。
const ENTERPRISE_TRAINING_TYPES = new Set(["corporate", "企業內訓"]);
const PUBLIC_COURSE_TYPES = new Set(["course", "公開課程"]);
function isEnterpriseTraining(type: string): boolean {
  return ENTERPRISE_TRAINING_TYPES.has(type);
}
function isPublicCourse(type: string): boolean {
  return PUBLIC_COURSE_TYPES.has(type);
}
function typeLabel(type: string): string {
  if (isEnterpriseTraining(type)) return "企業內訓";
  if (isPublicCourse(type)) return "公開課程";
  return type || "其他";
}

export interface ConsultingInquiry {
  id: string;
  name: string;
  company: string | null;
  status: string;
  createdAt: string | null;
}

export interface Quotation {
  id: string;
  title: string;
  clientName: string | null;
  totalAmount: number | null;
  status: string;
  createdAt: string | null;
}

export interface MonthlyProjectCount {
  /** "YYYY-MM" */
  month: string;
  /** 給圖表用的簡短標籤，例如 "3 月" */
  label: string;
  enterpriseTraining: number;
  publicCourse: number;
  other: number;
}

export interface PipelineOverview {
  totalProjects: number;
  closedProjects: number;
  enterpriseTrainingCount: number;
  publicCourseCount: number;
  recentProjects: PipelineProject[];
  openInquiries: ConsultingInquiry[];
  totalInquiries: number;
  recentQuotations: Quotation[];
  quotationsSentValue: number;
  quotationsDraftValue: number;
  /** 近 6 個月每月新增專案數，依企業內訓／公開課程／其他拆分，趨勢圖用 */
  monthlyTrend: MonthlyProjectCount[];
  /** 本月新增、正在進行的專案／課程／內訓 */
  thisMonthProjects: PipelineProject[];
}

/** 營運助理（Morgan）用：企業內訓／公開課程／企業顧問洽詢／報價單的真實現況，取代原本純手動填寫的產品線。 */
export async function getPipelineOverview(): Promise<PipelineOverview> {
  const supabase = getTeachingSupabase();

  const [{ data: projects }, { data: sessions }, { data: inquiries }, { data: quotations }] = await Promise.all([
    supabase
      .from("projects")
      .select("id,name,type,organization,current_phase,created_at")
      .order("created_at", { ascending: false }),
    supabase.from("project_sessions").select("project_id"),
    supabase
      .from("enterprise_inquiries")
      .select("id,name,company,status,created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("quotations")
      .select("id,title,client_name,total_amount,status,created_at")
      .order("created_at", { ascending: false }),
  ]);

  const sessionCountByProject = new Map<string, number>();
  (sessions ?? []).forEach((s: { project_id: string }) => {
    sessionCountByProject.set(s.project_id, (sessionCountByProject.get(s.project_id) ?? 0) + 1);
  });

  const allProjects: PipelineProject[] = (projects ?? []).map(
    (p: { id: string; name: string; type: string; organization: string; current_phase: string | null; created_at: string | null }) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      typeLabel: typeLabel(p.type),
      organization: p.organization,
      currentPhase: p.current_phase,
      sessionCount: sessionCountByProject.get(p.id) ?? 0,
      closed: (sessionCountByProject.get(p.id) ?? 0) > 0,
      createdAt: p.created_at,
    })
  );

  const openInquiries: ConsultingInquiry[] = (inquiries ?? [])
    .filter((i: { status: string }) => i.status === "new")
    .map((i: { id: string; name: string; company: string | null; status: string; created_at: string | null }) => ({
      id: i.id,
      name: i.name,
      company: i.company,
      status: i.status,
      createdAt: i.created_at,
    }));

  const allQuotations: Quotation[] = (quotations ?? []).map(
    (q: { id: string; title: string; client_name: string | null; total_amount: number | null; status: string; created_at: string | null }) => ({
      id: q.id,
      title: q.title,
      clientName: q.client_name,
      totalAmount: q.total_amount,
      status: q.status,
      createdAt: q.created_at,
    })
  );

  // 近 6 個月每月新增專案數（依類型拆分），給營運 Agent 的趨勢圖用
  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: monthKey(d), label: `${d.getMonth() + 1} 月` };
  });
  const bucket = new Map<string, { enterpriseTraining: number; publicCourse: number; other: number }>(
    months.map((m) => [m.key, { enterpriseTraining: 0, publicCourse: 0, other: 0 }])
  );
  allProjects.forEach((p) => {
    if (!p.createdAt) return;
    const b = bucket.get(monthKey(new Date(p.createdAt)));
    if (!b) return; // 超出近 6 個月視窗
    if (isEnterpriseTraining(p.type)) b.enterpriseTraining += 1;
    else if (isPublicCourse(p.type)) b.publicCourse += 1;
    else b.other += 1;
  });
  const monthlyTrend: MonthlyProjectCount[] = months.map((m) => ({ month: m.key, label: m.label, ...bucket.get(m.key)! }));

  const thisMonthKey = monthKey(now);
  const thisMonthProjects = allProjects.filter((p) => p.createdAt && monthKey(new Date(p.createdAt)) === thisMonthKey);

  return {
    totalProjects: allProjects.length,
    closedProjects: allProjects.filter((p) => p.closed).length,
    enterpriseTrainingCount: allProjects.filter((p) => isEnterpriseTraining(p.type)).length,
    publicCourseCount: allProjects.filter((p) => isPublicCourse(p.type)).length,
    recentProjects: allProjects.slice(0, 10),
    openInquiries,
    totalInquiries: (inquiries ?? []).length,
    recentQuotations: allQuotations.slice(0, 10),
    quotationsSentValue: allQuotations
      .filter((q) => q.status === "sent")
      .reduce((sum, q) => sum + (q.totalAmount ?? 0), 0),
    quotationsDraftValue: allQuotations
      .filter((q) => q.status === "draft")
      .reduce((sum, q) => sum + (q.totalAmount ?? 0), 0),
    monthlyTrend,
    thisMonthProjects,
  };
}
