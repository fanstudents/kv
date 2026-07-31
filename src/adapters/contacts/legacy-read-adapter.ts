import "server-only";
import { getSupabase } from "@/lib/supabase";
import type { ContactsReadPort } from "@/modules/contacts/read-ports";

const CONTACTS_SELECT =
  "*, visit_offers(status, created_at, resolved_at), pending_invites(id, status, subject, body, slot1, slot2, chosen_slot, location, calendar_event_id, to_email, created_at, resolved_at)";

export function createLegacyContactsReadAdapter(): ContactsReadPort {
  return {
    async list() {
      const { data, error } = await getSupabase()
        .from("contacts")
        .select(CONTACTS_SELECT)
        .order("created_at", { ascending: false });
      return { data, error };
    },
  };
}
