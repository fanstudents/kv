import type { VisitResearchInput } from "./research-ports";

export function parseVisitResearchRequest(body: unknown): VisitResearchInput {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return {
    contactId: typeof input.contactId === "string" ? input.contactId : null,
    name: typeof input.name === "string" ? input.name.trim() : "",
    company: typeof input.company === "string" ? input.company.trim() : null,
    title: null,
    email: null,
  };
}
