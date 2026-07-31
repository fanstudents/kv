import { describe, expect, it } from "vitest";
import { runVisitResearch, runVisitResearchRead } from "@/modules/visit/research-application";
import type { VisitResearchPort } from "@/modules/visit/research-ports";

function fakePort(overrides?: Partial<VisitResearchPort>) {
  const calls: string[] = [];
  const port: VisitResearchPort = {
    async findContact(id) {
      calls.push(`find:${id}`);
      return { name: "DB Name", company: "DB Co", title: "CEO", email: "db@example.test" };
    },
    async research(input) {
      calls.push(`research:${input.name}:${input.company}:${input.title}:${input.email}`);
      return "profile-1";
    },
    async listProfiles(limit) {
      calls.push(`list:${limit}`);
      return [{ id: "profile-1" }];
    },
    ...overrides,
  };
  return { port, calls };
}

describe("Visit research application", () => {
  it("reads the existing ten-profile projection", async () => {
    const { port, calls } = fakePort();
    await expect(runVisitResearchRead(port)).resolves.toEqual({ profiles: [{ id: "profile-1" }] });
    expect(calls).toEqual(["list:10"]);
  });

  it("uses the contact row as the source of truth when contactId is provided", async () => {
    const { port, calls } = fakePort();
    await expect(runVisitResearch({ contactId: "c1", name: "Typed Name", company: "Typed Co", title: null, email: null }, port)).resolves.toEqual({
      kind: "ok",
      data: { id: "profile-1", profiles: [{ id: "profile-1" }] },
    });
    expect(calls).toEqual(["find:c1", "research:DB Name:DB Co:CEO:db@example.test", "list:10"]);
  });

  it("keeps missing-name and failed-research outcomes", async () => {
    const missing = fakePort({ findContact: async () => null });
    await expect(runVisitResearch({ contactId: "c1", name: "", company: null, title: null, email: null }, missing.port)).resolves.toEqual({ kind: "invalid", message: "缺少要調查的對象姓名" });
    const failed = fakePort({ research: async () => null });
    await expect(runVisitResearch({ contactId: null, name: "Dennis", company: null, title: null, email: null }, failed.port)).resolves.toEqual({ kind: "error", message: "調查失敗，請稍後再試" });
  });
});
