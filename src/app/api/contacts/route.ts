import { NextResponse } from "next/server";
import { createLegacyContactsReadAdapter } from "@/adapters/contacts/legacy-read-adapter";
import { runContactsRead } from "@/modules/contacts/read-application";

export async function GET() {
  const result = await runContactsRead(createLegacyContactsReadAdapter());
  if (result.kind === "error") return NextResponse.json({ error: result.message }, { status: 400 });
  return NextResponse.json(result.data);
}
