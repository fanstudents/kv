export interface KnowledgeBaseRecheckChangedSource {
  sourceId: string;
  url: string;
  staleDocs: number;
}

export interface KnowledgeBaseRecheckResult {
  checked: number;
  changed: KnowledgeBaseRecheckChangedSource[];
}

export interface KnowledgeBaseRecheckPort {
  recheckUrlSources(limit: number): Promise<KnowledgeBaseRecheckResult>;
}
