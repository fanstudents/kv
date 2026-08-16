export interface VisitResearchInput {
  contactId: string | null;
  inviteId?: string | null;
  name: string;
  company: string | null;
  title: string | null;
  email: string | null;
}

export interface VisitResearchContactRecord {
  name: string | null;
  company: string | null;
  title: string | null;
  email: string | null;
}

export interface VisitProfileLink {
  label: string;
  url: string;
  kind?: string;
}

export interface VisitContactProfile {
  companySummary: string;
  personSummary: string;
  links: VisitProfileLink[];
  highlights: string[];
  talkingPoints: string[];
  sources: string[];
  confidence: number;
  /** Firecrawl 可信頁面 metadata 的代表圖，只作 TV projection，不寫入 contact_profiles。 */
  imageUrl?: string;
}

export interface ContactProfileRow {
  id: string;
  person_name: string;
  company: string | null;
  company_summary: string | null;
  person_summary: string | null;
  links: VisitProfileLink[];
  highlights: string[];
  talking_points: string[];
  sources: string[];
  confidence: number;
  status: string;
  created_at: string;
}

export interface VisitStoredResearch {
  input: VisitResearchInput;
  profile: VisitContactProfile;
  status: "done" | "empty";
  runId: string | null;
}

export interface VisitFailedResearch {
  input: VisitResearchInput;
  errorDetail: string;
  runId: string | null;
}

export interface VisitResearchRepository {
  findContact(contactId: string): Promise<VisitResearchContactRecord | null>;
  findRecentCompletedProfile(contactId: string, sinceIso: string): Promise<string | null>;
  storeProfile(research: VisitStoredResearch): Promise<string>;
  storeFailure(research: VisitFailedResearch): Promise<void>;
  listProfiles(limit: number): Promise<ContactProfileRow[]>;
  recordActivity(activity: {
    summary: string;
    status: "success" | "pending";
  }): Promise<void>;
}

export interface VisitResearchProvider {
  buildSearchInput(input: VisitResearchInput): string;
  search(searchInput: string): Promise<VisitContactProfile>;
  enrichCompanyProfile(input: VisitResearchInput, profile: VisitContactProfile): Promise<VisitContactProfile>;
  /** Search-only path may use an existing official link's og:image without Firecrawl. */
  resolveProfileImage?: (input: VisitResearchInput, profile: VisitContactProfile) => Promise<VisitContactProfile>;
}

export interface VisitResearchRuns {
  start(params: {
    triggerRef?: string;
    summary: string;
    meta: Record<string, unknown>;
  }): Promise<string | null>;
  step(
    runId: string | null,
    nodeId: string,
    patch: {
      status: "running" | "done" | "failed";
      seq: number;
      input?: string;
      output?: string;
    }
  ): Promise<void>;
  finish(
    runId: string | null,
    result:
      | { status: "success"; summary: string }
      | { status: "failed"; errorKind: "external"; errorDetail: string }
  ): Promise<void>;
  /** 將和特定 run/node 綁定的 projection artifact 寫入既有 runtime store。 */
  artifact?: (
    runId: string | null,
    nodeId: string,
    artifact: { title: string; uri: string },
  ) => Promise<void>;
}

export interface VisitResearchDependencies {
  repository: VisitResearchRepository;
  provider: VisitResearchProvider;
  runs: VisitResearchRuns;
  now?: () => number;
}

export function parseVisitResearchRequest(body: unknown): VisitResearchInput {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return {
    contactId: typeof input.contactId === "string" ? input.contactId : null,
    name: typeof input.name === "string" ? input.name.trim() : "",
    company: typeof input.company === "string" ? input.company.trim() : null,
    title: null,
    email: null,
  };
}

export type VisitResearchResult =
  | { kind: "invalid"; message: string }
  | { kind: "error"; message: string }
  | { kind: "ok"; data: { id: string; profiles: ContactProfileRow[] } };

export async function runVisitResearchRead(
  repository: VisitResearchRepository
): Promise<{ profiles: ContactProfileRow[] }> {
  return { profiles: await repository.listProfiles(10) };
}

function hasUsefulProfile(profile: VisitContactProfile): boolean {
  return (
    profile.companySummary.length > 0 ||
    profile.personSummary.length > 0 ||
    profile.links.length > 0 ||
    profile.highlights.length > 0
  );
}

function buildResearchSummary(profile: VisitContactProfile): string {
  const parts = [profile.companySummary, profile.personSummary].filter(Boolean);
  if (profile.highlights[0]) parts.push(`近況：${profile.highlights[0]}`);
  return parts.join("\n") || "沒有查到可靠的公開資料";
}

export async function runVisitContactResearch(
  input: VisitResearchInput,
  dependencies: VisitResearchDependencies
): Promise<string | null> {
  const { repository, provider, runs } = dependencies;

  if (input.contactId) {
    const now = dependencies.now?.() ?? Date.now();
    const sinceIso = new Date(now - 30 * 86400000).toISOString();
    const recentId = await repository.findRecentCompletedProfile(input.contactId, sinceIso);
    if (recentId) return recentId;
  }

  const runId = await runs.start({
    triggerRef: input.inviteId ? `research:${input.inviteId}` : undefined,
    summary: `拜訪前背景調查：${input.name}`,
    meta: { contactId: input.contactId, company: input.company },
  });
  const searchInput = provider.buildSearchInput(input);

  try {
    await runs.step(runId, "research-search", {
      status: "running",
      input: searchInput.slice(0, 200),
      seq: 0,
    });
    let profile: VisitContactProfile;
    try {
      profile = await provider.search(searchInput);
    } catch (error) {
      const errorDetail = error instanceof Error ? error.message : "unknown";
      await runs.step(runId, "research-search", {
        status: "failed",
        output: errorDetail.slice(0, 200),
        seq: 0,
      });
      throw error;
    }
    await runs.step(runId, "research-search", {
      status: "done",
      output: "公開資料搜尋完成",
      seq: 0,
    });
    if (!profile.companySummary && input.company) {
      await runs.step(runId, "research-firecrawl", {
        status: "running",
        input: input.company,
        seq: 1,
      });
      try {
        profile = await provider.enrichCompanyProfile(input, profile);
        await runs.step(runId, "research-firecrawl", {
          status: "done",
          output: profile.companySummary ? "已用官網補齊公司簡介" : "沒有可用的官網內容",
          seq: 1,
        });
      } catch (error) {
        const errorDetail = error instanceof Error ? error.message : "unknown";
        await runs.step(runId, "research-firecrawl", {
          status: "failed",
          output: errorDetail.slice(0, 200),
          seq: 1,
        });
      }
    }
    if (!profile.imageUrl && provider.resolveProfileImage) {
      try {
        profile = await provider.resolveProfileImage(input, profile);
      } catch {
        // The optional image lookup is non-fatal and must not change research truth.
      }
    }
    const found = hasUsefulProfile(profile);
    const id = await repository.storeProfile({
      input,
      profile,
      status: found ? "done" : "empty",
      runId,
    });

    if (profile.imageUrl && runs.artifact) {
      try {
        await runs.artifact(runId, "research-store", {
          title: `行前功課代表圖：${input.name}`,
          uri: profile.imageUrl,
        });
      } catch {
        // 代表圖是 TV projection，投影失敗不應讓已保存的研究結果變成失敗。
      }
    }

    await runs.step(runId, "research-store", {
      status: "done",
      output: `${buildResearchSummary(profile)}\n${profile.links.length} 個連結、${profile.highlights.length} 則近況`,
      seq: 2,
    });
    await runs.finish(runId, {
      status: "success",
      summary: found
        ? `已完成 ${input.name} 的行前背景調查`
        : `${input.name} 沒有查到可靠的公開資料`,
    });
    await repository.recordActivity({
      summary: found
        ? `已完成拜訪前背景調查：${input.name}${input.company ? `（${input.company}）` : ""}——${profile.links.length} 個公開連結、${profile.highlights.length} 則近況`
        : `拜訪前背景調查：${input.name} 沒有查到可靠的公開資料`,
      status: found ? "success" : "pending",
    });

    return id;
  } catch (error) {
    const errorDetail = error instanceof Error ? error.message : "unknown";
    await runs.finish(runId, {
      status: "failed",
      errorKind: "external",
      errorDetail,
    });
    try {
      await repository.storeFailure({ input, errorDetail, runId });
    } catch (failureWriteError) {
      // Research is best-effort; a failed compensation write must not break the confirmed visit.
      console.error(
        "[visit] research failure compensation unavailable",
        failureWriteError instanceof Error ? failureWriteError.message : "unknown error",
      );
    }
    return null;
  }
}

export async function runVisitResearch(
  input: VisitResearchInput,
  dependencies: VisitResearchDependencies
): Promise<VisitResearchResult> {
  let resolved = input;
  if (input.contactId) {
    const contact = await dependencies.repository.findContact(input.contactId);
    if (contact) {
      resolved = {
        ...input,
        name: contact.name ?? input.name,
        company: contact.company ?? input.company,
        title: contact.title,
        email: contact.email,
      };
    }
  }

  if (!resolved.name) return { kind: "invalid", message: "缺少要調查的對象姓名" };

  const id = await runVisitContactResearch(resolved, dependencies);
  if (!id) return { kind: "error", message: "調查失敗，請稍後再試" };
  return {
    kind: "ok",
    data: { id, profiles: await dependencies.repository.listProfiles(10) },
  };
}
