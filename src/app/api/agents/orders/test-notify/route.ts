import { NextResponse } from "next/server";
import { createLineOrdersDelivery } from "@/adapters/orders/line-orders-delivery";
import { createSupabaseOrdersRepository } from "@/adapters/orders/supabase-orders-repository";
import { getMainSupabase } from "@/lib/supabase";
import { runOrderTestNotification } from "@/modules/orders/orders";

export async function POST() {
  const result = await runOrderTestNotification({
    repository: createSupabaseOrdersRepository(getMainSupabase()),
    delivery: createLineOrdersDelivery(),
  });
  if (result.kind === "missing-recipient") return NextResponse.json({ error: result.message }, { status: 400 });
  if (result.kind === "error") return NextResponse.json({ error: result.message }, { status: 502 });
  return NextResponse.json({ ok: true, message: result.message });
}
