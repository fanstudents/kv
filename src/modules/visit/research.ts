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
      status: "running" | "done";
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
    const profile = await provider.search(searchInput);
    const found = hasUsefulProfile(profile);
    const id = await repository.storeProfile({
      input,
      profile,
      status: found ? "done" : "empty",
      runId,
    });

    await runs.step(runId, "research-store", {
      status: "done",
      output: `${profile.links.length} 個連結、${profile.highlights.length} 則近況`,
      seq: 1,
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
    } catch {
      // Research is best-effort; a failed compensation write must not break the confirmed visit.
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
