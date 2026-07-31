import "server-only";

import { addContactTag, getAvailableTags } from "@/lib/contact-tags";
import { getSupabase } from "@/lib/supabase";
import type { ContactTagPort } from "@/modules/contacts/tag-ports";

export function createLegacyContactTagAdapter(): ContactTagPort {
  let supabase: ReturnType<typeof getSupabase> | null = null;

  const getClient = () => {
    if (!supabase) supabase = getSupabase();
    return supabase;
  };

  return {
    list: () => getAvailableTags(getClient()),
    add: (contactId, tag) => addContactTag(getClient(), contactId, tag),
  };
}
