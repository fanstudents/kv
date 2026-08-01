import "server-only";
import { getMainSupabase } from "@/lib/supabase";
import type { ChecklistRepository } from "@/modules/checklist/service";

export const supabaseChecklistRepository: ChecklistRepository = {
  async list() {
    const { data, error } = await getMainSupabase()
      .from("checklist_status")
      .select("item_id, done");
    return { data, error };
  },

  async upsert(input) {
    const { data, error } = await getMainSupabase()
      .from("checklist_status")
      .upsert({ item_id: input.itemId, done: input.done, updated_at: input.updatedAt })
      .select()
      .single();
    return { data, error };
  },
};
