import { NextRequest, NextResponse } from "next/server";
import { createLegacyKnowledgeBaseReadAdapter } from "@/adapters/knowledge-base/legacy-read-adapter";
import {
  addKnowledgeDoc,
  removeKnowledgeDoc,
  updateKnowledgeDoc,
} from "@/lib/knowledge-base";
import { runKnowledgeBaseRead } from "@/modules/knowledge-base/read-application";
import { parseKnowledgeBaseReadQuery } from "@/modules/knowledge-base/read-rules";
import type { KnowledgeKind, KnowledgeLevel, KnowledgeStatus } from "@/lib/knowledge-base-data";

const KINDS = ["faq", "sop", "fact", "table", "doc"];
const STATUSES = ["draft", "published", "archived"];

export async function GET(req: NextRequest) {
  const filter = parseKnowledgeBaseReadQuery({
    status: req.nextUrl.searchParams.get("status"),
    sourceDocId: req.nextUrl.searchParams.get("sourceDocId"),
  });
  const result = await runKnowledgeBaseRead(filter, createLegacyKnowledgeBaseReadAdapter());
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim() : "";
  const level = Number(body.level) as KnowledgeLevel;

  if (!title || ![1, 2, 3, 4].includes(level)) {
    return NextResponse.json({ error: "缺少 title 或 level 不合法" }, { status: 400 });
  }

  const doc = await addKnowledgeDoc({
    title,
    category: category || "未分類",
    level,
    content: typeof body.content === "string" ? body.content.trim() : undefined,
    kind: KINDS.includes(body.kind) ? (body.kind as KnowledgeKind) : "doc",
    status: STATUSES.includes(body.status) ? (body.status as KnowledgeStatus) : "published",
  });
  return NextResponse.json(doc);
}

/** 更新一份文件（原本完全沒有這條路徑，改一個字只能刪掉重建） */
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

  const level = body.level === undefined ? undefined : (Number(body.level) as KnowledgeLevel);
  if (level !== undefined && ![1, 2, 3, 4].includes(level)) {
    return NextResponse.json({ error: "level 不合法" }, { status: 400 });
  }
  if (body.status !== undefined && !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "status 不合法" }, { status: 400 });
  }
  if (body.kind !== undefined && !KINDS.includes(body.kind)) {
    return NextResponse.json({ error: "kind 不合法" }, { status: 400 });
  }

  try {
    const doc = await updateKnowledgeDoc(id, {
      title: typeof body.title === "string" ? body.title.trim() : undefined,
      category: typeof body.category === "string" ? body.category.trim() : undefined,
      level,
      content: typeof body.content === "string" ? body.content : undefined,
      kind: body.kind as KnowledgeKind | undefined,
      status: body.status as KnowledgeStatus | undefined,
      owner: typeof body.owner === "string" ? body.owner : undefined,
      reviewAt: body.reviewAt === null || typeof body.reviewAt === "string" ? body.reviewAt : undefined,
    });
    if (!doc) return NextResponse.json({ error: "找不到這份文件" }, { status: 404 });
    return NextResponse.json(doc);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "更新失敗" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });

  const result = await removeKnowledgeDoc(id);
  // 內建示範文件刪不掉——照實回報，不要再像以前一樣「畫面刪掉了、資料庫還在」
  if (result === "builtin-protected") {
    return NextResponse.json(
      { error: "這是內建示範文件，不能刪除；可以改成「封存」讓它不再進入 Agent 的知識來源。" },
      { status: 409 }
    );
  }
  if (result === "not-found") {
    return NextResponse.json({ error: "找不到這份文件" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
