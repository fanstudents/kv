import { describe, expect, it } from "vitest";


import { createTeachingPipelineSource, type TeachingPipelineQueries } from "@/adapters/operations/teaching-pipeline-source";
import {
  buildPipelineOverview,
  type TeachingInquiryRow,
  type TeachingPipelineSnapshot,
  type TeachingProjectRow,
  type TeachingProjectSessionRow,
  type TeachingQuotationRow,
} from "@/modules/operations/pipeline";

const snapshot: TeachingPipelineSnapshot = {
  projects: [
    {
      id: "corporate-project",
      name: "企業 AI 工作坊",
      type: "corporate",
      organization: "Acme",
      current_phase: "delivery",
      created_at: "2026-08-01T01:00:00.000Z",
    },
    {
      id: "course-project",
      name: "公開班",
      type: "course",
      organization: "CabLate",
      current_phase: null,
      created_at: "2026-07-12T01:00:00.000Z",
    },
    {
      id: "other-project",
      name: "顧問案",
      type: "consulting",
      organization: "Beta",
      current_phase: null,
      created_at: "2025-01-01T01:00:00.000Z",
    },
  ],
  sessions: [{ project_id: "corporate-project" }, { project_id: "corporate-project" }],
  inquiries: [
    { id: "inquiry-new", name: "Dennis", company: "Acme", status: "new", created_at: null },
    { id: "inquiry-done", name: "Jane", company: null, status: "closed", created_at: null },
  ],
  quotations: [
    {
      id: "quotation-sent",
      title: "企業方案",
      client_name: "Acme",
      total_amount: 120_000,
      status: "sent",
      created_at: null,
    },
    {
      id: "quotation-draft",
      title: "公開班方案",
      client_name: null,
      total_amount: 30_000,
      status: "draft",
      created_at: null,
    },
  ],
};

function successfulQueries(overrides: Partial<TeachingPipelineQueries> = {}): TeachingPipelineQueries {
  return {
    projects: async () => ({ data: snapshot.projects, error: null }),
    sessions: async () => ({ data: snapshot.sessions, error: null }),
    inquiries: async () => ({ data: snapshot.inquiries, error: null }),
    quotations: async () => ({ data: snapshot.quotations, error: null }),
    ...overrides,
  };
}

describe("operations pipeline domain", () => {
  it("maps the Teaching snapshot into the existing dashboard contract", () => {
    const overview = buildPipelineOverview(snapshot, new Date(2026, 7, 1));

    expect(overview).toMatchObject({
      totalProjects: 3,
      closedProjects: 1,
      enterpriseTrainingCount: 1,
      publicCourseCount: 1,
      totalInquiries: 2,
      quotationsSentValue: 120_000,
      quotationsDraftValue: 30_000,
    });
    expect(overview.recentProjects[0]).toMatchObject({
      id: "corporate-project",
      typeLabel: "企業內訓",
      sessionCount: 2,
      closed: true,
    });
    expect(overview.openInquiries.map((inquiry) => inquiry.id)).toEqual(["inquiry-new"]);
    expect(overview.thisMonthProjects.map((project) => project.id)).toEqual(["corporate-project"]);
    expect(overview.monthlyTrend).toHaveLength(6);
    expect(overview.monthlyTrend.at(-1)).toMatchObject({
      month: "2026-08",
      enterpriseTraining: 1,
      publicCourse: 0,
      other: 0,
    });
  });

  it("keeps a successful empty snapshot distinct from provider failure", () => {
    const overview = buildPipelineOverview(
      { projects: [], sessions: [], inquiries: [], quotations: [] },
      new Date(2026, 7, 1)
    );

    expect(overview).toMatchObject({
      totalProjects: 0,
      closedProjects: 0,
      totalInquiries: 0,
      quotationsSentValue: 0,
      quotationsDraftValue: 0,
    });
    expect(overview.monthlyTrend).toHaveLength(6);
  });
});

describe("Teaching pipeline source", () => {
  it("reads the four external tables as one snapshot with a bounded signal", async () => {
    const observedSignals: AbortSignal[] = [];
    const observe = <Row,>(data: Row[]) => async (signal: AbortSignal) => {
      observedSignals.push(signal);
      return { data, error: null };
    };
    const source = createTeachingPipelineSource({
      projects: observe<TeachingProjectRow>(snapshot.projects),
      sessions: observe<TeachingProjectSessionRow>(snapshot.sessions),
      inquiries: observe<TeachingInquiryRow>(snapshot.inquiries),
      quotations: observe<TeachingQuotationRow>(snapshot.quotations),
    });

    await expect(source.readSnapshot()).resolves.toEqual(snapshot);
    expect(observedSignals).toHaveLength(4);
    expect(new Set(observedSignals).size).toBe(1);
    expect(observedSignals[0].aborted).toBe(false);
  });

  it("rejects the whole snapshot when any external query fails", async () => {
    const source = createTeachingPipelineSource(
      successfulQueries({
        inquiries: async () => ({ data: null, error: { message: "permission denied" } }),
      })
    );

    await expect(source.readSnapshot()).rejects.toThrow(
      "Teaching Supabase enterprise_inquiries query failed: permission denied"
    );
  });

  it("aborts a stalled external read at the configured timeout", async () => {
    const source = createTeachingPipelineSource(
      successfulQueries({
        projects: (signal) =>
          new Promise((_, reject) => {
            signal.addEventListener("abort", () => reject(signal.reason), { once: true });
          }),
      }),
      5
    );

    await expect(source.readSnapshot()).rejects.toMatchObject({ name: "TimeoutError" });
  });
});
