import { NextRequest, NextResponse } from "next/server";
import { createLegacyKnowledgeBaseImportReadAdapter } from "@/adapters/knowledge-base/legacy-import-read-adapter";
import { createLegacyKnowledgeBaseImportPublishAdapter } from "@/adapters/knowledge-base/legacy-import-publish-adapter";
import { createLegacyKnowledgeBaseImportDiscardAdapter } from "@/adapters/knowledge-base/legacy-import-discard-adapter";
import { importPdf } from "@/lib/kb-import";
import { runKnowledgeBaseImportRead } from "@/modules/knowledge-base/import-read-application";
import { parseKnowledgeBaseImportReadQuery } from "@/modules/knowledge-base/import-read-rules";
import { runKnowledgeBaseImportPublish } from "@/modules/knowledge-base/import-publish-application";
import { parseKnowledgeBaseImportPublishRequest } from "@/modules/knowledge-base/import-publish-rules";
import { runKnowledgeBaseImportDiscard } from "@/modules/knowledge-base/import-discard-application";
import { parseKnowledgeBaseImportDiscardRequest } from "@/modules/knowledge-base/import-discard-rules";

// 匯入一份 PDF：抽文字 → 切塊 → AI 轉條目 → 全部存成「草稿」等人審。
// 轉換要跑好幾次 AI，時間比一般請求久，所以放寬執行時間上限。
export const maxDuration = 300;

const MAX_BYTES = 12 * 1024 * 1024; // 12MB：再大就該先拆檔（雲端函式的請求本體也有上限）

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "請選擇一個 PDF 檔案" }, { status: 400 });
  }
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "目前只支援 PDF；Word／簡報請先另存成 PDF" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `檔案超過 ${MAX_BYTES / 1024 / 1024}MB，請先拆成多份` }, { status: 413 });
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const result = await importPdf({ buf, filename: file.name, mimeType: file.type });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "匯入失敗" }, { status: 500 });
  }
}

/** 列出待審的草稿（帶 sourceId 就只看那一份檔案轉出來的），或列出匯入過的檔案 */
export async function GET(req: NextRequest) {
  const query = parseKnowledgeBaseImportReadQuery(req.nextUrl.searchParams.get("sourceId"));
  return NextResponse.json(await runKnowledgeBaseImportRead(query, createLegacyKnowledgeBaseImportReadAdapter()));
}

/** 人審通過：把選到的草稿發布上線（沒按過這一步，AI 產的內容永遠不會進 Agent 的 prompt） */
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = parseKnowledgeBaseImportPublishRequest(body);
  if (parsed.kind === "invalid") return NextResponse.json({ error: parsed.message }, { status: 400 });
  return NextResponse.json(
    await runKnowledgeBaseImportPublish(parsed.ids, createLegacyKnowledgeBaseImportPublishAdapter())
  );
}

/** 丟棄草稿 */
export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const request = parseKnowledgeBaseImportDiscardRequest(body);
  return NextResponse.json(
    await runKnowledgeBaseImportDiscard(request, createLegacyKnowledgeBaseImportDiscardAdapter())
  );
}
