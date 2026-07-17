import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("contacts")
    .select(
      "*, visit_offers(status, created_at, resolved_at), pending_invites(id, status, subject, body, slot1, slot2, chosen_slot, location, calendar_event_id, to_email, created_at, resolved_at)"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
