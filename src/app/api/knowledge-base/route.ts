import { NextRequest, NextResponse } from "next/server";
import { addKnowledgeDoc, listAgentAccess, listKnowledgeDocs, removeKnowledgeDoc } from "@/lib/knowledge-base";
import type { KnowledgeLevel } from "@/lib/knowledge-base-data";

export async function GET() {
  const [docs, access] = await Promise.all([listKnowledgeDocs(), listAgentAccess()]);
  return NextResponse.json({ docs, access });
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
  });
  return NextResponse.json(doc);
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  await removeKnowledgeDoc(id);
  return NextResponse.json({ ok: true });
}
