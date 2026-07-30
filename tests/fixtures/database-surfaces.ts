export type DatabaseOwner = "kv-primary" | "teaching-system";
export type MigrationCoverage = "defined" | "alter-only" | "missing" | "external";

export interface DatabaseSurface {
  table: string;
  owner: DatabaseOwner;
  coverage: MigrationCoverage;
  notes?: string;
}

export const DATABASE_SURFACES: DatabaseSurface[] = [
  { table: "agent_artifacts", owner: "kv-primary", coverage: "defined" },
  { table: "agent_goals", owner: "kv-primary", coverage: "missing" },
  { table: "agent_live_task", owner: "kv-primary", coverage: "defined" },
  { table: "agent_memory", owner: "kv-primary", coverage: "defined" },
  { table: "agent_run_steps", owner: "kv-primary", coverage: "defined" },
  { table: "agent_runs", owner: "kv-primary", coverage: "defined" },
  { table: "agent_tasks", owner: "kv-primary", coverage: "defined" },
  { table: "ai_usage_logs", owner: "kv-primary", coverage: "missing" },
  { table: "broadcast_logs", owner: "kv-primary", coverage: "missing" },
  { table: "checklist_status", owner: "kv-primary", coverage: "missing" },
  { table: "contact_profiles", owner: "kv-primary", coverage: "missing" },
  { table: "contacts", owner: "kv-primary", coverage: "alter-only" },
  {
    table: "kb_chunks",
    owner: "kv-primary",
    coverage: "defined",
    notes: "Code expects title, source_page, and embedding; migration defines embedding_json.",
  },
  { table: "kb_citations", owner: "kv-primary", coverage: "defined" },
  {
    table: "kb_sources",
    owner: "kv-primary",
    coverage: "defined",
    notes: "Crawler expects source_type, url, content_hash, and last_checked_at.",
  },
  { table: "knowledge_access", owner: "kv-primary", coverage: "missing" },
  { table: "knowledge_base", owner: "kv-primary", coverage: "alter-only" },
  { table: "line_agent_activity", owner: "kv-primary", coverage: "missing" },
  { table: "line_agents", owner: "kv-primary", coverage: "missing" },
  { table: "line_conversation_locks", owner: "kv-primary", coverage: "missing" },
  { table: "line_subscribers", owner: "kv-primary", coverage: "missing" },
  { table: "line_support_conversations", owner: "kv-primary", coverage: "missing" },
  { table: "meeting_turns", owner: "kv-primary", coverage: "defined" },
  { table: "meetings", owner: "kv-primary", coverage: "defined" },
  { table: "metric_snapshots", owner: "kv-primary", coverage: "defined" },
  { table: "pending_invites", owner: "kv-primary", coverage: "missing" },
  { table: "teachify_orders", owner: "kv-primary", coverage: "defined" },
  { table: "visit_offers", owner: "kv-primary", coverage: "missing" },
  { table: "enterprise_inquiries", owner: "teaching-system", coverage: "external" },
  { table: "project_sessions", owner: "teaching-system", coverage: "external" },
  { table: "projects", owner: "teaching-system", coverage: "external" },
  { table: "quotations", owner: "teaching-system", coverage: "external" },
];

export const DATABASE_NON_TABLE_SURFACES = [
  {
    kind: "storage-bucket",
    name: "meeting-recordings",
    owner: "kv-primary",
    coverage: "defined",
  },
  {
    kind: "rpc",
    name: "match_kb_chunks",
    owner: "kv-primary",
    coverage: "missing",
  },
] as const;
