import { describe, expect, it } from "vitest";
import { parseVisitResearchRequest } from "@/modules/visit/research-rules";

describe("parseVisitResearchRequest", () => {
  it("keeps contactId/name/company normalization and null defaults", () => {
    expect(parseVisitResearchRequest({ contactId: "c1", name: " Dennis ", company: " Acme " })).toEqual({
      contactId: "c1",
      name: "Dennis",
      company: "Acme",
      title: null,
      email: null,
    });
    expect(parseVisitResearchRequest({ name: " " })).toEqual({ contactId: null, name: "", company: null, title: null, email: null });
  });
});
