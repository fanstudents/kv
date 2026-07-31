import "server-only";
import { getSupabase } from "@/lib/supabase";
import type { ChecklistUpdatePort } from "@/modules/checklist/update-ports";

export function createLegacyChecklistUpdateAdapter(): ChecklistUpdatePort {
  return {
    async upsert(input) {
      const { data, error } = await getSupabase()
        .from("checklist_status")
        .upsert({ item_id: input.itemId, done: input.done, updated_at: input.updatedAt })
        .select()
        .single();
      return { data, error };
    },
  };
}
