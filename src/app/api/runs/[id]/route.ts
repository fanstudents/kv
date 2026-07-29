import { NextResponse } from "next/server";
import { getRunDetail } from "@/lib/agent-runs";

// 一次執行的全貌：走過哪些流程節點、產出什麼、每一筆 AI 呼叫花了多少。
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getRunDetail(id);
  if (!detail.run) return NextResponse.json({ error: "找不到這次執行" }, { status: 404 });
  return NextResponse.json(detail);
}
