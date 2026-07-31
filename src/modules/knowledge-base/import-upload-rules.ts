export const KNOWLEDGE_BASE_IMPORT_MAX_BYTES = 12 * 1024 * 1024;

export interface KnowledgeBaseImportFileMetadata {
  name: string;
  size: number;
}

export type KnowledgeBaseImportUploadValidation =
  | { kind: "invalid"; status: 400 | 413; message: string }
  | { kind: "ok" };

export function validateKnowledgeBaseImportFile(
  file: KnowledgeBaseImportFileMetadata
): KnowledgeBaseImportUploadValidation {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return { kind: "invalid", status: 400, message: "目前只支援 PDF；Word／簡報請先另存成 PDF" };
  }
  if (file.size > KNOWLEDGE_BASE_IMPORT_MAX_BYTES) {
    return {
      kind: "invalid",
      status: 413,
      message: `檔案超過 ${KNOWLEDGE_BASE_IMPORT_MAX_BYTES / 1024 / 1024}MB，請先拆成多份`,
    };
  }
  return { kind: "ok" };
}
