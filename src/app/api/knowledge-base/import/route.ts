import { NextRequest, NextResponse } from "next/server";
import { createSupabaseKnowledgeIngestion } from "@/adapters/knowledge-base/supabase-knowledge-adapters";
import {
  discardKnowledgeDrafts,
  parseKnowledgeIngestionDiscard,
  parseKnowledgeIngestionPublish,
  parseKnowledgeIngestionRead,
  publishKnowledgeDrafts,
  readKnowledgeIngestion,
  uploadKnowledgeSource,
  validateKnowledgeIngestionFile,
} from "@/modules/knowledge-base/ingestion";

// 匯入一份 PDF：抽文字 → 切塊 → AI 轉條目 → 全部存成「草稿」等人審。
// 轉換要跑好幾次 AI，時間比一般請求久，所以放寬執行時間上限。
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "請選擇一個 PDF 檔案" }, { status: 400 });
  }
  const validation = validateKnowledgeIngestionFile(file);
  if (validation.kind === "invalid") {
    return NextResponse.json({ error: validation.message }, { status: validation.status });
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const result = await uploadKnowledgeSource(
      { buf, filename: file.name, mimeType: file.type },
      createSupabaseKnowledgeIngestion()
    );
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "匯入失敗" }, { status: 500 });
  }
}

/** 列出待審的草稿（帶 sourceId 就只看那一份檔案轉出來的），或列出匯入過的檔案 */
export async function GET(req: NextRequest) {
  const query = parseKnowledgeIngestionRead(req.nextUrl.searchParams.get("sourceId"));
  return NextResponse.json(await readKnowledgeIngestion(query, createSupabaseKnowledgeIngestion()));
}

/** 人審通過：把選到的草稿發布上線（沒按過這一步，AI 產的內容永遠不會進 Agent 的 prompt） */
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const parsed = parseKnowledgeIngestionPublish(body);
  if (parsed.kind === "invalid") return NextResponse.json({ error: parsed.message }, { status: 400 });
  return NextResponse.json(
    await publishKnowledgeDrafts(parsed.ids, createSupabaseKnowledgeIngestion())
  );
}

/** 丟棄草稿 */
export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const request = parseKnowledgeIngestionDiscard(body);
  return NextResponse.json(
    await discardKnowledgeDrafts(request, createSupabaseKnowledgeIngestion())
  );
}
