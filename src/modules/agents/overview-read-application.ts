import type { AgentOverviewReadPort } from "./overview-read-ports";

export type AgentOverviewReadResult<TData> =
  | { kind: "success"; data: TData }
  | { kind: "error"; message: string };

export async function runAgentOverview<TData>(
  port: AgentOverviewReadPort<TData>,
  days?: number,
): Promise<AgentOverviewReadResult<TData>> {
  try {
    return { kind: "success", data: await port.read(days) };
  } catch (error) {
    return { kind: "error", message: error instanceof Error ? error.message : "讀取失敗" };
  }
}
