export interface IntegrationStatusEntry {
  connected: boolean;
  detail?: string;
}

export type IntegrationStatusMap = Record<string, IntegrationStatusEntry>;

export interface IntegrationStatusPort {
  getStatus(): Promise<IntegrationStatusMap>;
}
