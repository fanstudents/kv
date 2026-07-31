import "server-only";
import { importPdf } from "@/lib/kb-import";
import type { KnowledgeBaseImportUploadPort } from "@/modules/knowledge-base/import-upload-ports";

export function createLegacyKnowledgeBaseImportUploadAdapter(): KnowledgeBaseImportUploadPort {
  return { importFile: importPdf };
}
