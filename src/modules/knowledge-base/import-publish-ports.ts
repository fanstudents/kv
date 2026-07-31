export interface KnowledgeBaseImportPublishPort {
  publish(ids: string[]): Promise<number>;
}
