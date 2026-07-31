export type AgentInstanceRecord = Record<string, unknown>;

export interface AgentAdminActivity {
  agent_slug: string;
  summary: string;
  status: "failed" | "success";
}

export interface AgentStatusCatalogEntry {
  slug: string;
  status: string;
}

export interface AgentStatusRow {
  slug: string;
  enabled: unknown;
}

export type AgentStatusMap = Record<string, boolean>;

export interface AgentAdminRepository {
  getBySlug(slug: string): Promise<{
    data: AgentInstanceRecord | null;
    errorMessage: string | null;
  }>;
  updateBySlug(slug: string, update: Record<string, unknown>): Promise<{
    data: AgentInstanceRecord | null;
    errorMessage: string | null;
  }>;
  listStatuses(): Promise<{
    data: AgentStatusRow[] | null;
    error: unknown;
  }>;
  recordActivity(activity: AgentAdminActivity): Promise<void>;
}

export interface AgentInstanceUpdateBody {
  enabled?: unknown;
  settings?: unknown;
}

interface AgentInstanceUpdateInput {
  update: Record<string, unknown>;
  enabledChanged: boolean;
  settingsChanged: boolean;
}

export function parseAgentInstanceUpdateRequest(
  body: AgentInstanceUpdateBody,
  now = new Date().toISOString()
): AgentInstanceUpdateInput {
  const update: Record<string, unknown> = { updated_at: now };
  const enabledChanged = typeof body.enabled === "boolean";
  const settingsChanged = Boolean(body.settings && typeof body.settings === "object");

  if (enabledChanged) update.enabled = body.enabled;
  if (settingsChanged) update.settings = body.settings;

  return { update, enabledChanged, settingsChanged };
}

export type AgentInstanceReadResult =
  | { kind: "found"; data: AgentInstanceRecord }
  | { kind: "not-found"; message: string };

export async function readAgentInstance(
  slug: string,
  repository: AgentAdminRepository
): Promise<AgentInstanceReadResult> {
  const result = await repository.getBySlug(slug);
  if (result.errorMessage || !result.data) {
    return { kind: "not-found", message: result.errorMessage ?? "not found" };
  }
  return { kind: "found", data: result.data };
}

export type AgentInstanceUpdateResult =
  | { kind: "updated"; data: AgentInstanceRecord | null }
  | { kind: "error"; message: string };

export async function updateAgentInstance(
  slug: string,
  body: AgentInstanceUpdateBody,
  repository: AgentAdminRepository,
  now?: string
): Promise<AgentInstanceUpdateResult> {
  const input = parseAgentInstanceUpdateRequest(body, now);
  const result = await repository.updateBySlug(slug, input.update);

  if (result.errorMessage) {
    await repository.recordActivity({
      agent_slug: slug,
      summary: `更新設定失敗：${result.errorMessage}`,
      status: "failed",
    });
    return { kind: "error", message: result.errorMessage };
  }

  if (input.enabledChanged) {
    await repository.recordActivity({
      agent_slug: slug,
      summary: body.enabled ? "Agent 已啟用" : "Agent 已停用",
      status: "success",
    });
  }
  if (input.settingsChanged) {
    await repository.recordActivity({ agent_slug: slug, summary: "已更新 Agent 設定", status: "success" });
  }

  return { kind: "updated", data: result.data };
}

export function buildAgentStatusMap(
  catalog: readonly AgentStatusCatalogEntry[],
  rows: readonly AgentStatusRow[] | null,
): AgentStatusMap {
  const enabled: AgentStatusMap = {};
  for (const row of rows ?? []) {
    enabled[row.slug] = Boolean(row.enabled);
  }
  for (const agent of catalog) {
    if (!(agent.slug in enabled)) enabled[agent.slug] = agent.status === "active";
  }
  return enabled;
}

export async function readAgentStatuses(
  repository: AgentAdminRepository,
  catalog: readonly AgentStatusCatalogEntry[],
): Promise<{ enabled: AgentStatusMap }> {
  try {
    const { data } = await repository.listStatuses();
    return { enabled: buildAgentStatusMap(catalog, data) };
  } catch {
    return { enabled: buildAgentStatusMap(catalog, null) };
  }
}
