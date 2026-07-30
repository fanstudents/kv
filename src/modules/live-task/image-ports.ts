export interface LiveTaskImagePort {
  getImage(agentSlug: string): Promise<string | null>;
}
