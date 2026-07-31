export interface KnowledgeBaseCrawlPreviewLink {
  url: string;
  title?: string;
}

export interface KnowledgeBaseCrawlCreditUsage {
  remaining: number;
  plan: number;
  periodEnd: string | null;
}

export interface KnowledgeBaseCrawlPreviewPort {
  getCreditUsage(): Promise<KnowledgeBaseCrawlCreditUsage | null>;
  mapSite(url: string, limit: number): Promise<KnowledgeBaseCrawlPreviewLink[]>;
  isQuotaError(error: unknown): boolean;
}
