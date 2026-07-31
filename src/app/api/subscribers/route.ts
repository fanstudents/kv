import { NextResponse } from "next/server";
import { createLegacySubscribersReadAdapter } from "@/adapters/subscribers/legacy-read-adapter";
import { runSubscribersRead } from "@/modules/subscribers/read-application";

export async function GET() {
  const result = await runSubscribersRead(createLegacySubscribersReadAdapter());
  if (result.kind === "error") {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json(result.data);
}
