import { NextResponse } from "next/server";
import { supabaseSubscribersRepository } from "@/adapters/subscribers/supabase-subscribers-repository";
import { createSubscribersService } from "@/modules/subscribers/service";

const subscribers = createSubscribersService(supabaseSubscribersRepository);

export async function GET() {
  const result = await subscribers.read();
  if (result.kind === "error") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json(result.data);
}
