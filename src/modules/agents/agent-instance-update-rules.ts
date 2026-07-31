export interface AgentInstanceUpdateBody {
  enabled?: unknown;
  settings?: unknown;
}

export interface AgentInstanceUpdateInput {
  slug: string;
  update: Record<string, unknown>;
  enabledChanged: boolean;
  settingsChanged: boolean;
}

export function parseAgentInstanceUpdateRequest(
  slug: string,
  body: AgentInstanceUpdateBody,
  now = new Date().toISOString()
): AgentInstanceUpdateInput {
  const update: Record<string, unknown> = { updated_at: now };
  const enabledChanged = typeof body.enabled === "boolean";
  const settingsChanged = Boolean(body.settings && typeof body.settings === "object");

  if (enabledChanged) update.enabled = body.enabled;
  if (settingsChanged) update.settings = body.settings;

  return { slug, update, enabledChanged, settingsChanged };
}
