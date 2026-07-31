export interface AgentOverviewReadPort<TData> {
  read(days?: number): Promise<TData>;
}
