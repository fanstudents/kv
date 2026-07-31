import type { VisitResearchInput, VisitResearchPort } from "./research-ports";

export type VisitResearchResult =
  | { kind: "invalid"; message: string }
  | { kind: "error"; message: string }
  | { kind: "ok"; data: { id: string; profiles: unknown } };

export async function runVisitResearchRead(port: VisitResearchPort): Promise<{ profiles: unknown }> {
  return { profiles: await port.listProfiles(10) };
}

export async function runVisitResearch(input: VisitResearchInput, port: VisitResearchPort): Promise<VisitResearchResult> {
  let resolved = input;
  if (input.contactId) {
    const contact = await port.findContact(input.contactId);
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

  const id = await port.research(resolved);
  if (!id) return { kind: "error", message: "調查失敗，請稍後再試" };
  return { kind: "ok", data: { id, profiles: await port.listProfiles(10) } };
}
