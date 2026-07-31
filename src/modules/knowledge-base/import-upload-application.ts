import type { KnowledgeBaseImportResult, KnowledgeBaseImportUploadInput, KnowledgeBaseImportUploadPort } from "./import-upload-ports";

export async function runKnowledgeBaseImportUpload(
  input: KnowledgeBaseImportUploadInput,
  port: KnowledgeBaseImportUploadPort
): Promise<KnowledgeBaseImportResult> {
  return port.importFile(input);
}
