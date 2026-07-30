export type ApiMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type ApiAccess = "session" | "public-auth" | "public-webhook" | "public-callback" | "cron";
export type ApiFamily =
  | "auth"
  | "agents"
  | "visit"
  | "knowledge"
  | "meeting"
  | "line"
  | "orders"
  | "support"
  | "goals"
  | "operations"
  | "runtime"
  | "dashboard";

export type ProviderBoundary =
  | "local"
  | "supabase"
  | "openai"
  | "line"
  | "google"
  | "firecrawl"
  | "teachify";

export interface ApiSurface {
  source: string;
  route: string;
  methods: ApiMethod[];
  access: ApiAccess;
  family: ApiFamily;
  providers: ProviderBoundary[];
}

function surface(
  sourcePath: string,
  methods: ApiMethod[],
  access: ApiAccess,
  family: ApiFamily,
  providers: ProviderBoundary[]
): ApiSurface {
  return {
    source: `src/app/api/${sourcePath}/route.ts`,
    route: `/api/${sourcePath}`,
    methods,
    access,
    family,
    providers,
  };
}

export const API_SURFACES: ApiSurface[] = [
  surface("activity", ["GET"], "session", "dashboard", ["supabase"]),
  surface("agent-chat", ["POST"], "session", "agents", ["openai", "supabase"]),
  surface("agents", ["GET"], "session", "agents", ["supabase"]),
  surface("agents/[slug]", ["GET", "PATCH"], "session", "agents", ["supabase"]),
  surface("agents/[slug]/activity", ["GET"], "session", "agents", ["supabase"]),
  surface("agents/[slug]/test-push", ["POST"], "session", "agents", ["line"]),
  surface("agents/expense/seo-overview", ["GET"], "session", "agents", ["google"]),
  surface("agents/operations/pipeline", ["GET"], "session", "operations", ["supabase"]),
  surface("agents/orders/test-notify", ["POST"], "session", "orders", ["line", "supabase"]),
  surface("agents/report/traffic-overview", ["GET"], "session", "agents", ["google"]),
  surface("agents/schedule/week-overview", ["GET"], "session", "agents", ["google"]),
  surface("agents/support/log-reply", ["GET", "POST"], "public-callback", "support", ["supabase"]),
  surface("agents/support/report-now", ["POST"], "session", "support", ["openai", "supabase"]),
  surface("agents/teamlead/report-now", ["POST"], "session", "agents", ["openai", "supabase"]),
  surface("agents/visit/draft-email", ["POST"], "session", "visit", ["openai", "supabase"]),
  surface("agents/visit/parse-card", ["POST"], "session", "visit", ["openai", "supabase"]),
  surface("agents/visit/research", ["GET", "POST"], "session", "visit", ["openai", "supabase"]),
  surface(
    "agents/visit/respond",
    ["GET", "POST"],
    "public-callback",
    "visit",
    ["supabase", "google", "line", "openai"]
  ),
  surface("ai-usage", ["GET"], "session", "dashboard", ["supabase"]),
  surface("auth/login", ["POST"], "public-auth", "auth", ["local"]),
  surface("auth/logout", ["POST"], "public-auth", "auth", ["local"]),
  surface("checklist", ["GET"], "session", "operations", ["supabase"]),
  surface("checklist/[id]", ["PATCH"], "session", "operations", ["supabase"]),
  surface("contacts", ["GET"], "session", "visit", ["supabase"]),
  surface("cron/kb-recheck", ["GET"], "cron", "knowledge", ["firecrawl", "supabase"]),
  surface("cron/metric-snapshot", ["GET"], "cron", "goals", ["supabase"]),
  surface("cron/support-daily-report", ["GET"], "cron", "support", ["openai", "supabase"]),
  surface("cron/team-lead-report", ["GET"], "cron", "agents", ["openai", "supabase"]),
  surface("cron/visit-timeout", ["GET"], "cron", "visit", ["supabase", "line"]),
  surface("goals", ["GET", "PUT", "DELETE", "POST"], "session", "goals", ["supabase"]),
  surface("goals/history", ["GET"], "session", "goals", ["supabase"]),
  surface("integrations/status", ["GET"], "session", "dashboard", ["local"]),
  surface("knowledge-base", ["GET", "POST", "PATCH", "DELETE"], "session", "knowledge", ["supabase"]),
  surface("knowledge-base/access", ["PUT"], "session", "knowledge", ["supabase"]),
  surface("knowledge-base/crawl", ["GET", "POST"], "session", "knowledge", ["firecrawl", "openai", "supabase"]),
  surface("knowledge-base/import", ["POST", "GET", "PUT", "DELETE"], "session", "knowledge", ["openai", "supabase"]),
  surface("knowledge-base/reindex", ["GET", "POST"], "session", "knowledge", ["openai", "supabase"]),
  surface("line/webhook", ["GET", "POST"], "public-webhook", "line", ["line", "openai", "google", "supabase"]),
  surface("line/webhook/support", ["GET", "POST"], "public-webhook", "support", ["line", "supabase"]),
  surface("live-task", ["GET", "POST"], "session", "runtime", ["supabase"]),
  surface("live-task/history", ["GET"], "session", "runtime", ["supabase"]),
  surface("live-task/image", ["GET"], "session", "runtime", ["supabase"]),
  surface("meeting/command", ["POST"], "session", "meeting", ["openai", "supabase"]),
  surface("meeting/finish", ["POST"], "session", "meeting", ["supabase"]),
  surface("meeting/log-turn", ["POST"], "session", "meeting", ["supabase"]),
  surface("meeting/log-usage", ["POST"], "session", "meeting", ["supabase"]),
  surface("meeting/realtime-session", ["POST"], "session", "meeting", ["openai", "supabase"]),
  surface("meeting/recording", ["GET"], "session", "meeting", ["supabase"]),
  surface("meeting/speak", ["POST"], "session", "meeting", ["openai"]),
  surface("meeting/start", ["POST"], "session", "meeting", ["supabase"]),
  surface("meeting/transcribe", ["POST"], "session", "meeting", ["openai"]),
  surface("subscribers", ["GET"], "session", "support", ["supabase"]),
  surface("subscribers/[id]", ["PATCH"], "session", "support", ["supabase"]),
  surface("subscribers/broadcast", ["GET", "POST"], "session", "support", ["line", "supabase"]),
  surface("tv/idle", ["GET"], "session", "dashboard", ["google", "supabase"]),
  surface("webhooks/teachify-order", ["GET", "POST"], "public-webhook", "orders", ["teachify", "line", "supabase"]),
];

export const PUBLIC_API_ROUTES = API_SURFACES.filter((item) => item.access !== "session").map(
  (item) => item.route
);
