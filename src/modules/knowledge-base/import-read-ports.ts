import type { KnowledgeDoc } from "@/lib/knowledge-base-data";

export interface KnowledgeBaseImportSource {
  id: string;
  filename: string;
  page_count: number | null;
  status: string;
  created_at: string;
}

export interface KnowledgeBaseImportReadPort {
  listSources(): Promise<KnowledgeBaseImportSource[]>;
  listDraftDocs(sourceId: string): Promise<KnowledgeDoc[]>;
}
