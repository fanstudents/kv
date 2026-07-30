export type SurfaceAccess = "public" | "protected";
export type SurfaceFamily =
  | "auth"
  | "catalog"
  | "dashboard"
  | "agent"
  | "knowledge"
  | "meeting"
  | "operations"
  | "super-agent"
  | "immersive"
  | "static";

export interface AppPageSurface {
  source: string;
  route: string;
  testPath: string;
  access: SurfaceAccess;
  family: SurfaceFamily;
  visualBaseline?: boolean;
}

export const APP_PAGE_SURFACES: AppPageSurface[] = [
  { source: "src/app/login/page.tsx", route: "/login", testPath: "/login", access: "public", family: "auth", visualBaseline: true },
  { source: "src/app/agents-catalog/page.tsx", route: "/agents-catalog", testPath: "/agents-catalog", access: "public", family: "catalog", visualBaseline: true },
  { source: "src/app/agents-catalog/general/page.tsx", route: "/agents-catalog/general", testPath: "/agents-catalog/general", access: "public", family: "catalog" },
  { source: "src/app/agents-catalog/professional/page.tsx", route: "/agents-catalog/professional", testPath: "/agents-catalog/professional", access: "public", family: "catalog" },
  { source: "src/app/agents-catalog/super/page.tsx", route: "/agents-catalog/super", testPath: "/agents-catalog/super", access: "public", family: "catalog" },
  { source: "src/app/(dashboard)/dashboard/page.tsx", route: "/dashboard", testPath: "/dashboard", access: "protected", family: "dashboard", visualBaseline: true },
  { source: "src/app/(dashboard)/ai-usage/page.tsx", route: "/ai-usage", testPath: "/ai-usage", access: "protected", family: "operations" },
  { source: "src/app/(dashboard)/anomalies/page.tsx", route: "/anomalies", testPath: "/anomalies", access: "protected", family: "operations" },
  { source: "src/app/(dashboard)/flow-atlas/page.tsx", route: "/flow-atlas", testPath: "/flow-atlas", access: "protected", family: "operations" },
  { source: "src/app/(dashboard)/goals/page.tsx", route: "/goals", testPath: "/goals", access: "protected", family: "operations" },
  { source: "src/app/(dashboard)/integrations/page.tsx", route: "/integrations", testPath: "/integrations", access: "protected", family: "operations" },
  { source: "src/app/(dashboard)/knowledge-base/page.tsx", route: "/knowledge-base", testPath: "/knowledge-base", access: "protected", family: "knowledge", visualBaseline: true },
  { source: "src/app/(dashboard)/knowledge-base/import/page.tsx", route: "/knowledge-base/import", testPath: "/knowledge-base/import", access: "protected", family: "knowledge" },
  { source: "src/app/(dashboard)/outputs/page.tsx", route: "/outputs", testPath: "/outputs", access: "protected", family: "operations" },
  { source: "src/app/(dashboard)/settings/page.tsx", route: "/settings", testPath: "/settings", access: "protected", family: "operations" },
  { source: "src/app/(dashboard)/subscribers/page.tsx", route: "/subscribers", testPath: "/subscribers", access: "protected", family: "operations" },
  { source: "src/app/(dashboard)/todos/page.tsx", route: "/todos", testPath: "/todos", access: "protected", family: "operations" },
  { source: "src/app/(dashboard)/super-agents/page.tsx", route: "/super-agents", testPath: "/super-agents", access: "protected", family: "super-agent" },
  { source: "src/app/(dashboard)/super-agents/[id]/page.tsx", route: "/super-agents/[id]", testPath: "/super-agents/ecommerce", access: "protected", family: "super-agent" },
  { source: "src/app/(dashboard)/agents/card/page.tsx", route: "/agents/card", testPath: "/agents/card", access: "protected", family: "agent" },
  { source: "src/app/(dashboard)/agents/competitor/page.tsx", route: "/agents/competitor", testPath: "/agents/competitor", access: "protected", family: "agent" },
  { source: "src/app/(dashboard)/agents/expense/page.tsx", route: "/agents/expense", testPath: "/agents/expense", access: "protected", family: "agent" },
  { source: "src/app/(dashboard)/agents/notify/page.tsx", route: "/agents/notify", testPath: "/agents/notify", access: "protected", family: "agent" },
  { source: "src/app/(dashboard)/agents/operations/page.tsx", route: "/agents/operations", testPath: "/agents/operations", access: "protected", family: "agent" },
  { source: "src/app/(dashboard)/agents/orders/page.tsx", route: "/agents/orders", testPath: "/agents/orders", access: "protected", family: "agent" },
  { source: "src/app/(dashboard)/agents/report/page.tsx", route: "/agents/report", testPath: "/agents/report", access: "protected", family: "agent" },
  { source: "src/app/(dashboard)/agents/schedule/page.tsx", route: "/agents/schedule", testPath: "/agents/schedule", access: "protected", family: "agent" },
  { source: "src/app/(dashboard)/agents/support/page.tsx", route: "/agents/support", testPath: "/agents/support", access: "protected", family: "agent" },
  { source: "src/app/(dashboard)/agents/teamlead/page.tsx", route: "/agents/teamlead", testPath: "/agents/teamlead", access: "protected", family: "agent" },
  { source: "src/app/(dashboard)/agents/today/page.tsx", route: "/agents/today", testPath: "/agents/today", access: "protected", family: "agent" },
  { source: "src/app/(dashboard)/agents/visit/page.tsx", route: "/agents/visit", testPath: "/agents/visit", access: "protected", family: "agent", visualBaseline: true },
  { source: "src/app/meeting/page.tsx", route: "/meeting", testPath: "/meeting", access: "protected", family: "meeting", visualBaseline: true },
  { source: "src/app/tv/page.tsx", route: "/tv", testPath: "/tv", access: "protected", family: "immersive" },
  { source: "src/app/tv/console/page.tsx", route: "/tv/console", testPath: "/tv/console", access: "protected", family: "immersive" },
  { source: "src/app/universe/page.tsx", route: "/universe", testPath: "/universe", access: "protected", family: "immersive" },
];

export const STATIC_SURFACES = [
  { source: "public/agent-team.html", route: "/", access: "public", family: "static" },
  { source: "public/agent-team.html", route: "/agent-team.html", access: "public", family: "static" },
  { source: "public/agent-config.html", route: "/agent-config.html", access: "public", family: "static" },
  { source: "public/knowledge-base.html", route: "/knowledge-base.html", access: "public", family: "static" },
  { source: "public/super-agent.html", route: "/super-agent.html", access: "public", family: "static" },
  { source: "public/agent-architecture.html", route: "/agent-architecture.html", access: "public", family: "static" },
] as const;
