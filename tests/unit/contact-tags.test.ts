import { describe, expect, it, vi } from "vitest";
import { addContactTag } from "@/lib/contact-tags";

function createContactTagClient(options?: {
  tags?: string[];
  readError?: string;
  writeError?: string;
}) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: options?.readError ? null : { tags: options?.tags ?? [] },
    error: options?.readError ? { message: options.readError } : null,
  });
  const readEq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq: readEq }));
  const writeEq = vi.fn().mockResolvedValue({
    data: null,
    error: options?.writeError ? { message: options.writeError } : null,
  });
  const update = vi.fn(() => ({ eq: writeEq }));
  return {
    client: { from: vi.fn(() => ({ select, update })) },
    update,
  };
}

describe("contact tag persistence", () => {
  it("returns the current tags without writing a duplicate", async () => {
    const fixture = createContactTagClient({ tags: ["待跟進"] });

    await expect(addContactTag(fixture.client as never, "contact-1", "待跟進")).resolves.toEqual(["待跟進"]);
    expect(fixture.update).not.toHaveBeenCalled();
  });

  it("persists and returns a new tag", async () => {
    const fixture = createContactTagClient({ tags: ["潛在客戶"] });

    await expect(addContactTag(fixture.client as never, "contact-1", "待跟進")).resolves.toEqual([
      "潛在客戶",
      "待跟進",
    ]);
    expect(fixture.update).toHaveBeenCalledWith({ tags: ["潛在客戶", "待跟進"] });
  });

  it("does not report a tag when the lookup or write fails", async () => {
    const readFailure = createContactTagClient({ readError: "read unavailable" });
    await expect(addContactTag(readFailure.client as never, "contact-1", "待跟進")).rejects.toThrow(
      "Contact tag lookup failed: read unavailable",
    );

    const writeFailure = createContactTagClient({ writeError: "write unavailable" });
    await expect(addContactTag(writeFailure.client as never, "contact-1", "待跟進")).rejects.toThrow(
      "Contact tag write failed: write unavailable",
    );
  });
});
