export interface VisitResearchInput {
  contactId: string | null;
  name: string;
  company: string | null;
  title: string | null;
  email: string | null;
}

export interface VisitResearchContactRecord {
  name: string | null;
  company: string | null;
  title: string | null;
  email: string | null;
}

/** The real boundary is the external contact/profile data source, not an API route slice. */
export interface VisitResearchSource {
  findContact(contactId: string): Promise<VisitResearchContactRecord | null>;
  research(input: VisitResearchInput): Promise<string | null>;
  listProfiles(limit: number): Promise<unknown>;
}

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

export type VisitResearchResult =
  | { kind: "invalid"; message: string }
  | { kind: "error"; message: string }
  | { kind: "ok"; data: { id: string; profiles: unknown } };

export async function runVisitResearchRead(source: VisitResearchSource): Promise<{ profiles: unknown }> {
  return { profiles: await source.listProfiles(10) };
}

export async function runVisitResearch(input: VisitResearchInput, source: VisitResearchSource): Promise<VisitResearchResult> {
  let resolved = input;
  if (input.contactId) {
    const contact = await source.findContact(input.contactId);
    if (contact) {
      resolved = {
        ...input,
        name: contact.name ?? input.name,
        company: contact.company ?? input.company,
        title: contact.title ?? null,
        email: contact.email ?? null,
      };
    }
  }

  if (!resolved.name) return { kind: "invalid", message: "缺少要調查的對象姓名" };

  const id = await source.research(resolved);
  if (!id) return { kind: "error", message: "調查失敗，請稍後再試" };
  return { kind: "ok", data: { id, profiles: await source.listProfiles(10) } };
}
