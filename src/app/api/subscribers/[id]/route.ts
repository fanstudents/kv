import { NextRequest, NextResponse } from "next/server";
import { createLegacySubscribersUpdateAdapter } from "@/adapters/subscribers/legacy-update-adapter";
import { runSubscribersUpdate } from "@/modules/subscribers/update-application";
import { parseSubscribersUpdateRequest } from "@/modules/subscribers/update-rules";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const result = await runSubscribersUpdate(
    parseSubscribersUpdateRequest(id, body),
    createLegacySubscribersUpdateAdapter(),
  );
  if (result.kind === "error") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json(result.data);
}
