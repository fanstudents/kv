import { describe, expect, it, vi } from "vitest";
import {
  createOperationsService,
  parseActivityReadRequest,
  parseAgentActivityReadRequest,
  type OperationsRepository,
} from "@/modules/operations/service";

function repository(overrides: Partial<OperationsRepository> = {}): OperationsRepository {
  return {
    listContacts: vi.fn(async () => ({
      data: [{ id: "c1", visit_offers: [], pending_invites: [] }],
      error: null,
    })),
    listActivity: vi.fn(async () => ({ data: [{ id: "a1", status: "ok" }], error: null })),
    list: vi.fn(async () => []),
    add: vi.fn(async () => []),
    ...overrides,
  };
}

describe("Operations service", () => {
  it("preserves activity query coercion and fixed agent limit", () => {
    expect(parseActivityReadRequest("failed", "25")).toEqual({
      agentSlug: null,
      status: "failed",
      limit: 25,
    });
    expect(parseActivityReadRequest(null, null)).toEqual({
      agentSlug: null,
      status: null,
      limit: 200,
    });
    expect(parseActivityReadRequest("", "oops")).toEqual({
      agentSlug: null,
      status: "",
      limit: Number.NaN,
    });
    expect(parseAgentActivityReadRequest("visit")).toEqual({
      agentSlug: "visit",
      status: null,
      limit: 20,
    });
  });

  it("returns nested contacts and raw activity unchanged", async () => {
    const repo = repository();
    const service = createOperationsService(repo);
    await expect(service.readContacts()).resolves.toEqual({
      kind: "ok",
      data: [{ id: "c1", visit_offers: [], pending_invites: [] }],
    });
    await expect(service.readActivity({ agentSlug: null, status: null, limit: 200 })).resolves.toEqual({
      kind: "ok",
      data: [{ id: "a1", status: "ok" }],
    });
    expect(repo.listActivity).toHaveBeenCalledWith({ agentSlug: null, status: null, limit: 200 });
  });

  it("maps repository errors to the existing result", async () => {
    const service = createOperationsService(repository({
      listContacts: vi.fn(async () => ({ data: null, error: { message: "contacts down" } })),
      listActivity: vi.fn(async () => ({ data: null, error: { message: "activity down" } })),
    }));
    await expect(service.readContacts()).resolves.toEqual({ kind: "error", message: "contacts down" });
    await expect(service.readActivity({ agentSlug: null, status: null, limit: 200 })).resolves.toEqual({
      kind: "error",
      message: "activity down",
    });
  });
});
