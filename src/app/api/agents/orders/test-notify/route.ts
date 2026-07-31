import { NextResponse } from "next/server";
import { createLegacyOrdersTestNotificationAdapter } from "@/adapters/orders/legacy-orders-test-notification-adapter";
import { runOrderTestNotification } from "@/modules/orders/test-notification-application";

export async function POST() {
  const result = await runOrderTestNotification(createLegacyOrdersTestNotificationAdapter());
  if (result.kind === "missing-recipient") return NextResponse.json({ error: result.message }, { status: 400 });
  if (result.kind === "error") return NextResponse.json({ error: result.message }, { status: 502 });
  return NextResponse.json({ ok: true, message: result.message });
}
