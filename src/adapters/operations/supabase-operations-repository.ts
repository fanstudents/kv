import "server-only";
import { addContactTag, getAvailableTags } from "@/lib/contact-tags";
import { getMainSupabase } from "@/lib/supabase";
import type { OperationsRepository } from "@/modules/operations/service";

const CONTACTS_SELECT =
  "*, visit_offers(status, created_at, resolved_at), pending_invites(id, status, subject, body, slot1, slot2, chosen_slot, location, calendar_event_id, to_email, created_at, resolved_at)";

const getClient = () => getMainSupabase();

export const supabaseOperationsRepository: OperationsRepository = {
  async listContacts() {
    const { data, error } = await getClient()
      .from("contacts")
      .select(CONTACTS_SELECT)
      .order("created_at", { ascending: false });
    return { data, error };
  },

  async listActivity(input) {
    let query = getClient()
      .from("line_agent_activity")
      .select("*");
    if (input.agentSlug) query = query.eq("agent_slug", input.agentSlug);
    query = query.order("occurred_at", { ascending: false }).limit(input.limit);
    if (input.status) query = query.eq("status", input.status);
    return (await query) as { data: unknown; error: { message: string } | null };
  },

  list() {
    return getAvailableTags(getClient());
  },

  add(contactId, tag) {
    return addContactTag(getClient(), contactId, tag);
  },
};
