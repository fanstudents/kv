export interface TeachingProjectRow {
  id: string;
  name: string;
  type: string;
  organization: string;
  current_phase: string | null;
  created_at: string | null;
}

export interface TeachingProjectSessionRow {
  project_id: string;
}

export interface TeachingInquiryRow {
  id: string;
  name: string;
  company: string | null;
  status: string;
  created_at: string | null;
}

export interface TeachingQuotationRow {
  id: string;
  title: string;
  client_name: string | null;
  total_amount: number | null;
  status: string;
  created_at: string | null;
}

export interface TeachingPipelineSnapshot {
  projects: TeachingProjectRow[];
  sessions: TeachingProjectSessionRow[];
  inquiries: TeachingInquiryRow[];
  quotations: TeachingQuotationRow[];
}

export interface TeachingPipelineSource {
  readSnapshot(): Promise<TeachingPipelineSnapshot>;
}

export interface PipelineProject {
  id: string;
  name: string;
  type: string;
  /** 給畫面顯示用的中文類型標籤（來源可能是英文代碼或既有中文值）。 */
  typeLabel: string;
  organization: string;
  currentPhase: string | null;
  sessionCount: number;
  closed: boolean;
  createdAt: string | null;
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
  /** YYYY-MM */
  month: string;
  /** 給圖表用的簡短標籤，例如「3 月」。 */
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
  monthlyTrend: MonthlyProjectCount[];
  thisMonthProjects: PipelineProject[];
}

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

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * 將外部 Teaching 專案的唯讀快照轉成 KV 營運畫面使用的模型。
 * 此處只負責業務分類與彙整，不知道 Supabase、環境變數或 HTTP。
 */
export function buildPipelineOverview(snapshot: TeachingPipelineSnapshot, now = new Date()): PipelineOverview {
  const sessionCountByProject = new Map<string, number>();
  snapshot.sessions.forEach((session) => {
    sessionCountByProject.set(session.project_id, (sessionCountByProject.get(session.project_id) ?? 0) + 1);
  });

  const allProjects: PipelineProject[] = snapshot.projects.map((project) => {
    const sessionCount = sessionCountByProject.get(project.id) ?? 0;
    return {
      id: project.id,
      name: project.name,
      type: project.type,
      typeLabel: typeLabel(project.type),
      organization: project.organization,
      currentPhase: project.current_phase,
      sessionCount,
      closed: sessionCount > 0,
      createdAt: project.created_at,
    };
  });

  const openInquiries: ConsultingInquiry[] = snapshot.inquiries
    .filter((inquiry) => inquiry.status === "new")
    .map((inquiry) => ({
      id: inquiry.id,
      name: inquiry.name,
      company: inquiry.company,
      status: inquiry.status,
      createdAt: inquiry.created_at,
    }));

  const allQuotations: Quotation[] = snapshot.quotations.map((quotation) => ({
    id: quotation.id,
    title: quotation.title,
    clientName: quotation.client_name,
    totalAmount: quotation.total_amount,
    status: quotation.status,
    createdAt: quotation.created_at,
  }));

  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return { key: monthKey(date), label: `${date.getMonth() + 1} 月` };
  });
  const bucket = new Map<string, { enterpriseTraining: number; publicCourse: number; other: number }>(
    months.map((month) => [month.key, { enterpriseTraining: 0, publicCourse: 0, other: 0 }])
  );

  allProjects.forEach((project) => {
    if (!project.createdAt) return;
    const counts = bucket.get(monthKey(new Date(project.createdAt)));
    if (!counts) return;
    if (isEnterpriseTraining(project.type)) counts.enterpriseTraining += 1;
    else if (isPublicCourse(project.type)) counts.publicCourse += 1;
    else counts.other += 1;
  });

  const monthlyTrend: MonthlyProjectCount[] = months.map((month) => ({
    month: month.key,
    label: month.label,
    ...bucket.get(month.key)!,
  }));
  const thisMonth = monthKey(now);

  return {
    totalProjects: allProjects.length,
    closedProjects: allProjects.filter((project) => project.closed).length,
    enterpriseTrainingCount: allProjects.filter((project) => isEnterpriseTraining(project.type)).length,
    publicCourseCount: allProjects.filter((project) => isPublicCourse(project.type)).length,
    recentProjects: allProjects.slice(0, 10),
    openInquiries,
    totalInquiries: snapshot.inquiries.length,
    recentQuotations: allQuotations.slice(0, 10),
    quotationsSentValue: allQuotations
      .filter((quotation) => quotation.status === "sent")
      .reduce((sum, quotation) => sum + (quotation.totalAmount ?? 0), 0),
    quotationsDraftValue: allQuotations
      .filter((quotation) => quotation.status === "draft")
      .reduce((sum, quotation) => sum + (quotation.totalAmount ?? 0), 0),
    monthlyTrend,
    thisMonthProjects: allProjects.filter(
      (project) => project.createdAt && monthKey(new Date(project.createdAt)) === thisMonth
    ),
  };
}

export async function readPipelineOverview(
  source: TeachingPipelineSource,
  now = new Date()
): Promise<PipelineOverview> {
  return buildPipelineOverview(await source.readSnapshot(), now);
}
