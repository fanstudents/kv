export interface KnowledgeBaseImportUploadInput {
  buf: Buffer;
  filename: string;
  mimeType?: string;
}

export interface KnowledgeBaseImportResult {
  sourceId: string;
  filename: string;
  pageCount: number;
  chunkCount: number;
  processedChunks: number;
  candidateCount: number;
  truncated: boolean;
}

export interface KnowledgeBaseImportUploadPort {
  importFile(input: KnowledgeBaseImportUploadInput): Promise<KnowledgeBaseImportResult>;
}
