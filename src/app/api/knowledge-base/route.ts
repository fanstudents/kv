import { NextRequest, NextResponse } from "next/server";
import { createLegacyKnowledgeBaseCreateAdapter } from "@/adapters/knowledge-base/legacy-create-adapter";
import { createLegacyKnowledgeBaseDeleteAdapter } from "@/adapters/knowledge-base/legacy-delete-adapter";
import { createLegacyKnowledgeBaseReadAdapter } from "@/adapters/knowledge-base/legacy-read-adapter";
import { createLegacyKnowledgeBaseUpdateAdapter } from "@/adapters/knowledge-base/legacy-update-adapter";
import { runKnowledgeBaseCreate } from "@/modules/knowledge-base/create-application";
import { parseKnowledgeBaseCreateRequest } from "@/modules/knowledge-base/create-rules";
import { runKnowledgeBaseDelete } from "@/modules/knowledge-base/delete-application";
import { parseKnowledgeBaseDeleteRequest } from "@/modules/knowledge-base/delete-rules";
import { runKnowledgeBaseRead } from "@/modules/knowledge-base/read-application";
import { parseKnowledgeBaseReadQuery } from "@/modules/knowledge-base/read-rules";
import { runKnowledgeBaseUpdate } from "@/modules/knowledge-base/update-application";
import { parseKnowledgeBaseUpdateRequest } from "@/modules/knowledge-base/update-rules";

export async function GET(req: NextRequest) {
  const filter = parseKnowledgeBaseReadQuery({
    status: req.nextUrl.searchParams.get("status"),
    sourceDocId: req.nextUrl.searchParams.get("sourceDocId"),
  });
  const result = await runKnowledgeBaseRead(filter, createLegacyKnowledgeBaseReadAdapter());
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const parsed = parseKnowledgeBaseCreateRequest(await req.json().catch(() => ({})));
  if (parsed.kind === "invalid") return NextResponse.json({ error: parsed.message }, { status: 400 });

  const doc = await runKnowledgeBaseCreate(parsed.input, createLegacyKnowledgeBaseCreateAdapter());
  return NextResponse.json(doc);
}

/** 更新一份文件（原本完全沒有這條路徑，改一個字只能刪掉重建） */
export async function PATCH(req: NextRequest) {
  const parsed = parseKnowledgeBaseUpdateRequest(await req.json().catch(() => ({})));
  if (parsed.kind === "invalid") return NextResponse.json({ error: parsed.message }, { status: 400 });

  const result = await runKnowledgeBaseUpdate(parsed.input, createLegacyKnowledgeBaseUpdateAdapter());
  if (result.kind === "not-found") return NextResponse.json({ error: "找不到這份文件" }, { status: 404 });
  if (result.kind === "error") return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json(result.data);
}

export async function DELETE(req: NextRequest) {
  const parsed = parseKnowledgeBaseDeleteRequest(req.nextUrl.searchParams.get("id"));
  if (parsed.kind === "invalid") return NextResponse.json({ error: parsed.message }, { status: 400 });

  const result = await runKnowledgeBaseDelete(parsed.id, createLegacyKnowledgeBaseDeleteAdapter());
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
