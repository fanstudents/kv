import { NextRequest, NextResponse } from "next/server";
import { createSupabaseKnowledgeRepository } from "@/adapters/knowledge-base/supabase-knowledge-adapters";
import {
  createKnowledgeDocument,
  deleteKnowledgeDocument,
  parseKnowledgeDocumentCreate,
  parseKnowledgeDocumentDelete,
  parseKnowledgeDocumentQuery,
  parseKnowledgeDocumentUpdate,
  readKnowledgeDocuments,
  updateKnowledgeDocument,
} from "@/modules/knowledge-base/documents";

export async function GET(req: NextRequest) {
  const filter = parseKnowledgeDocumentQuery({
    status: req.nextUrl.searchParams.get("status"),
    sourceDocId: req.nextUrl.searchParams.get("sourceDocId"),
  });
  const result = await readKnowledgeDocuments(filter, createSupabaseKnowledgeRepository());
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const parsed = parseKnowledgeDocumentCreate(await req.json().catch(() => ({})));
  if (parsed.kind === "invalid") return NextResponse.json({ error: parsed.message }, { status: 400 });

  const doc = await createKnowledgeDocument(parsed.input, createSupabaseKnowledgeRepository());
  return NextResponse.json(doc);
}

/** 更新一份文件（原本完全沒有這條路徑，改一個字只能刪掉重建） */
export async function PATCH(req: NextRequest) {
  const parsed = parseKnowledgeDocumentUpdate(await req.json().catch(() => ({})));
  if (parsed.kind === "invalid") return NextResponse.json({ error: parsed.message }, { status: 400 });

  const result = await updateKnowledgeDocument(parsed.input, createSupabaseKnowledgeRepository());
  if (result.kind === "not-found") return NextResponse.json({ error: "找不到這份文件" }, { status: 404 });
  if (result.kind === "error") return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json(result.data);
}

export async function DELETE(req: NextRequest) {
  const parsed = parseKnowledgeDocumentDelete(req.nextUrl.searchParams.get("id"));
  if (parsed.kind === "invalid") return NextResponse.json({ error: parsed.message }, { status: 400 });

  const result = await deleteKnowledgeDocument(parsed.id, createSupabaseKnowledgeRepository());
  // 內建示範文件刪不掉——照實回報，不要再像以前一樣「畫面刪掉了、資料庫還在」
  if (result.kind === "builtin-protected") {
    return NextResponse.json(
      { error: "這是內建示範文件，不能刪除；可以改成「封存」讓它不再進入 Agent 的知識來源。" },
      { status: 409 }
    );
  }
  if (result.kind === "not-found") {
    return NextResponse.json({ error: "找不到這份文件" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
