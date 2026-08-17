import { mapLineAgentOverride, type AgentStatusCatalogEntry } from "@/modules/agents/identity";
import { validateVisitSettingsForWrite } from "@/modules/visit/settings";

export type AgentInstanceRecord = Record<string, unknown>;

export interface AgentAdminActivity {
  agent_slug: string;
  summary: string;
  status: "failed" | "success";
}

export type { AgentStatusCatalogEntry } from "@/modules/agents/identity";

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

interface AgentInstanceUpdateInputError {
  errorMessage: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function recordUpdateFailure(slug: string, message: string, repository: AgentAdminRepository) {
  return repository.recordActivity({
    agent_slug: slug,
    summary: `更新設定失敗：${message}`,
    status: "failed",
  });
}

export function parseAgentInstanceUpdateRequest(
  body: AgentInstanceUpdateBody,
  now = new Date().toISOString(),
  slug?: string,
): AgentInstanceUpdateInput | AgentInstanceUpdateInputError {
  const update: Record<string, unknown> = { updated_at: now };
  const enabledChanged = typeof body.enabled === "boolean";
  const settingsChanged = Boolean(body.settings && typeof body.settings === "object");

  if (settingsChanged && slug === "visit") {
    const validation = validateVisitSettingsForWrite(body.settings);
    if (!validation.success) return { errorMessage: validation.message };
  }

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
  const input = parseAgentInstanceUpdateRequest(body, now, slug);
  if ("errorMessage" in input) {
    await recordUpdateFailure(slug, input.errorMessage, repository);
    return { kind: "error", message: input.errorMessage };
  }

  if (slug === "visit" && input.settingsChanged && isRecord(input.update.settings)) {
    // Agent pages send their current page projection. Merge it with the
    // existing row before writing so unknown/future Visit keys are not silently
    // deleted by a save from an older page bundle.
    const current = await repository.getBySlug(slug);
    if (current.errorMessage) {
      await recordUpdateFailure(slug, `Visit 設定讀取失敗：${current.errorMessage}`, repository);
      return { kind: "error", message: `Visit 設定讀取失敗：${current.errorMessage}` };
    }
    const currentSettings = current.data?.settings;
    if (isRecord(currentSettings)) {
      input.update.settings = { ...currentSettings, ...input.update.settings };
      const mergedValidation = validateVisitSettingsForWrite(input.update.settings);
      if (!mergedValidation.success) {
        await recordUpdateFailure(slug, mergedValidation.message, repository);
        return { kind: "error", message: mergedValidation.message };
      }
    }
  }

  const result = await repository.updateBySlug(slug, input.update);

  if (result.errorMessage) {
    await recordUpdateFailure(slug, result.errorMessage, repository);
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
    const override = mapLineAgentOverride(row);
    enabled[override.legacySlug] = override.enabled;
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
  const { data, error } = await repository.listStatuses();
  if (error) {
    const message =
      typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
        ? error.message
        : "Agent status read failed";
    throw new Error(message);
  }
  return { enabled: buildAgentStatusMap(catalog, data) };
}
