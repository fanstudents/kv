import "server-only";
import { getSupabase } from "@/lib/supabase";
import type { ChecklistReadPort } from "@/modules/checklist/read-ports";

export function createLegacyChecklistReadAdapter(): ChecklistReadPort {
  return {
    async list() {
      const { data, error } = await getSupabase()
        .from("checklist_status")
        .select("item_id, done");
      return { data, error };
    },
  };
}
