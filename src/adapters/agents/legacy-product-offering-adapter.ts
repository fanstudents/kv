import { AGENT_CATALOG } from "@/lib/agent-catalog";
import { mapLegacyProductOffering } from "@/modules/agents/identity";

/** Public catalog offerings are commercial products, not deployed instances. */
export const LEGACY_PRODUCT_OFFERINGS = AGENT_CATALOG.map(mapLegacyProductOffering);
