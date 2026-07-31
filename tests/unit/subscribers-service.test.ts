import { describe, expect, it, vi } from "vitest";
import {
  createSubscribersService,
  parseSubscribersUpdateRequest,
  type SubscribersRepository,
} from "@/modules/subscribers/service";

function repository(overrides: Partial<SubscribersRepository> = {}): SubscribersRepository {
  return {
    list: vi.fn(async () => ({ data: [{ id: "s1", tags: ["vip"] }], error: null })),
    update: vi.fn(async () => ({ data: { id: "s1" }, error: null })),
    touch: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("Subscribers service", () => {
  it("keeps non-empty tags and note fields", () => {
    expect(parseSubscribersUpdateRequest("s1", { tags: [" vip ", "", 1, "  "], note: "memo" })).toEqual({
      kind: "ok",
      id: "s1",
      update: { tags: [" vip "], note: "memo" },
    });
  });

  it("rejects a body with no recognized fields", () => {
    expect(parseSubscribersUpdateRequest("s1", null)).toEqual({
      kind: "invalid",
      message: "沒有可更新的欄位",
    });
    expect(parseSubscribersUpdateRequest("s1", { unknown: true })).toEqual({
      kind: "invalid",
      message: "沒有可更新的欄位",
    });
  });

  it("reads and updates through one repository owner", async () => {
    const repo = repository();
    const service = createSubscribersService(repo);
    await expect(service.read()).resolves.toEqual({ kind: "ok", data: [{ id: "s1", tags: ["vip"] }] });
    await expect(service.update({ kind: "ok", id: "s1", update: { tags: ["vip"] } })).resolves.toEqual({
      kind: "ok",
      data: { id: "s1" },
    });
    expect(repo.update).toHaveBeenCalledWith("s1", { tags: ["vip"] });
  });

  it("maps invalid requests and repository errors", async () => {
    const service = createSubscribersService(repository({
      list: vi.fn(async () => ({ data: null, error: { message: "query failed" } })),
      update: vi.fn(async () => ({ data: null, error: { message: "write failed" } })),
    }));
    await expect(service.read()).resolves.toEqual({ kind: "error", message: "query failed" });
    await expect(service.update({ kind: "invalid", message: "沒有可更新的欄位" })).resolves.toEqual({
      kind: "error",
      message: "沒有可更新的欄位",
    });
    await expect(service.update({ kind: "ok", id: "s1", update: { note: "memo" } })).resolves.toEqual({
      kind: "error",
      message: "write failed",
    });
  });
});
