import { NextRequest, NextResponse } from "next/server";
import { supabaseSubscribersRepository } from "@/adapters/subscribers/supabase-subscribers-repository";
import { createSubscribersService, parseSubscribersUpdateRequest } from "@/modules/subscribers/service";

const subscribers = createSubscribersService(supabaseSubscribersRepository);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const result = await subscribers.update(parseSubscribersUpdateRequest(id, body));
  if (result.kind === "error") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json(result.data);
}
