import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const tagFns = vi.hoisted(() => ({
  getAvailableTags: vi.fn(),
  addContactTag: vi.fn(),
}));
const getSupabase = vi.hoisted(() => vi.fn(() => ({ id: "supabase-client" })));

vi.mock("@/lib/contact-tags", () => tagFns);
vi.mock("@/lib/supabase", () => ({ getSupabase }));

import { createLegacyContactTagAdapter } from "@/adapters/contacts/legacy-tag-adapter";

describe("legacy contact tag adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the existing available-tag query binding", async () => {
    tagFns.getAvailableTags.mockResolvedValue(["潛在客戶", "合作夥伴"]);
    const adapter = createLegacyContactTagAdapter();

    await expect(adapter.list()).resolves.toEqual(["潛在客戶", "合作夥伴"]);

    expect(getSupabase).toHaveBeenCalledOnce();
    expect(tagFns.getAvailableTags).toHaveBeenCalledWith({ id: "supabase-client" });
  });

  it("keeps the existing contact tag write binding and shares its lazy client", async () => {
    tagFns.addContactTag.mockResolvedValue(["潛在客戶", "待跟進"]);
    const adapter = createLegacyContactTagAdapter();

    await expect(adapter.add("contact-1", "待跟進")).resolves.toEqual(["潛在客戶", "待跟進"]);

    expect(getSupabase).toHaveBeenCalledOnce();
    expect(tagFns.addContactTag).toHaveBeenCalledWith({ id: "supabase-client" }, "contact-1", "待跟進");
  });
});
