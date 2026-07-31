import { describe, expect, it, vi } from "vitest";
import { runContactsRead } from "@/modules/contacts/read-application";

describe("Contacts read application", () => {
  it("maps a legacy query error to the existing error result", async () => {
    const port = { list: vi.fn().mockResolvedValue({ data: null, error: { message: "database down" } }) };

    await expect(runContactsRead(port)).resolves.toEqual({ kind: "error", message: "database down" });
  });

  it("returns nested contact data unchanged", async () => {
    const data = [{ id: "c1", visit_offers: [], pending_invites: [] }];
    const port = { list: vi.fn().mockResolvedValue({ data, error: null }) };

    await expect(runContactsRead(port)).resolves.toEqual({ kind: "ok", data });
  });
});
