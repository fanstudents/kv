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

export interface VisitResearchPort {
  findContact(contactId: string): Promise<VisitResearchContactRecord | null>;
  research(input: VisitResearchInput): Promise<string | null>;
  listProfiles(limit: number): Promise<unknown>;
}
