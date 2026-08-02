import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMainSupabase } = vi.hoisted(() => ({ getMainSupabase: vi.fn() }));

vi.mock("@/lib/supabase", () => ({ getMainSupabase }));

import { logConversationMessage } from "@/lib/support-conversations";

beforeEach(() => vi.clearAllMocks());

describe("Support conversation persistence", () => {
  it("keeps the support conversation insert payload", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({ insert }));
    getMainSupabase.mockReturnValue({ from });

    await logConversationMessage("U123", "customer", "Need help");

    expect(from).toHaveBeenCalledWith("line_support_conversations");
    expect(insert).toHaveBeenCalledWith({ line_user_id: "U123", role: "customer", text: "Need help" });
  });
});
