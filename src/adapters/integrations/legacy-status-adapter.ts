import "server-only";
import { getIntegrationStatus } from "@/lib/integration-status";
import type { IntegrationStatusPort } from "@/modules/integrations/status-ports";

export function createLegacyIntegrationStatusAdapter(): IntegrationStatusPort {
  return { getStatus: getIntegrationStatus };
}
