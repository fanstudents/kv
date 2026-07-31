import type { IntegrationStatusMap, IntegrationStatusPort } from "./status-ports";

export async function runIntegrationStatus(port: IntegrationStatusPort): Promise<IntegrationStatusMap> {
  return port.getStatus();
}
