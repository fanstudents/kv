import { describe, expect, it } from "vitest";
import { AGENT_CATALOG } from "@/lib/agent-catalog";
import { AGENTS, LEGACY_AGENT_DATA } from "@/lib/agent-data";
import {
  applyLegacyLineAgentOverride,
  getCanonicalAgentByLegacySlug,
  getLegacyAgentStatusCatalog,
  LEGACY_AGENT_REGISTRY,
  toLegacyAgentMeta,
} from "@/adapters/agents/legacy-agent-identity-adapter";
import { LEGACY_PRODUCT_OFFERINGS } from "@/adapters/agents/legacy-product-offering-adapter";
import {
  createCanonicalAgentRegistry,
  DuplicateCanonicalAgentError,
  type LegacyAgentIdentityInput,
} from "@/modules/agents/identity";

describe("canonical Agent identity compatibility", () => {
  it("gives every legacy dashboard Agent one unique identity while preserving its presentation", () => {
    expect(LEGACY_AGENT_REGISTRY.agents).toHaveLength(LEGACY_AGENT_DATA.length);
    expect(new Set(LEGACY_AGENT_REGISTRY.agents.map((agent) => agent.instance.id)).size).toBe(LEGACY_AGENT_DATA.length);

    const visit = getCanonicalAgentByLegacySlug("visit");
    const legacyVisit = AGENTS.find((agent) => agent.slug === "visit");
    expect(visit).toMatchObject({
      instance: {
        id: "agent:visit",
        legacySlug: "visit",
        roleTemplateId: "role:visit",
        deploymentId: "legacy-static-registry",
      },
      presentation: {
        legacySlug: "visit",
        name: legacyVisit?.name,
        role: legacyVisit?.role,
        metrics: legacyVisit?.metrics,
      },
    });
    expect(AGENTS).toEqual(LEGACY_AGENT_DATA);
    expect(LEGACY_AGENT_REGISTRY.agents.map(toLegacyAgentMeta)).toEqual(AGENTS);
  });

  it("keeps line_agents overrides scoped to deployment state, not presentation", () => {
    const visit = getCanonicalAgentByLegacySlug("visit");
    if (!visit) throw new Error("expected visit Agent");

    const overridden = applyLegacyLineAgentOverride(visit, {
      slug: "visit",
      enabled: 0,
      settings: { tone: "brief" },
    });
    expect(overridden.instance).toMatchObject({ enabled: false, settings: { tone: "brief" } });
    expect(overridden.presentation).toEqual(visit.presentation);
    expect(applyLegacyLineAgentOverride(visit, { slug: "support", enabled: false })).toBe(visit);
  });

  it("preserves existing static status fallback and keeps product offerings separate from instances", () => {
    expect(getLegacyAgentStatusCatalog()).toEqual(
      LEGACY_AGENT_DATA.map((agent) => ({ slug: agent.slug, status: agent.status }))
    );
    expect(LEGACY_PRODUCT_OFFERINGS).toHaveLength(AGENT_CATALOG.length);
    expect(LEGACY_PRODUCT_OFFERINGS.every((offering) => offering.id.startsWith("offering:"))).toBe(true);
    expect(LEGACY_PRODUCT_OFFERINGS.some((offering) => offering.id === "agent:visit")).toBe(false);
  });

  it("rejects duplicate legacy identities instead of silently choosing an owner", () => {
    const input: LegacyAgentIdentityInput = {
      slug: "visit",
      name: "Visit",
      shortName: "Visit",
      tagline: "",
      description: "",
      color: "#000000",
      status: "active",
      metrics: [],
      lastRun: "",
      recipients: 0,
      personEn: "Coco",
      personZh: "Coco",
      role: "Visit",
    };
    expect(() => createCanonicalAgentRegistry([input, input])).toThrow(DuplicateCanonicalAgentError);
  });
});
