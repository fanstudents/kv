import { describe, expect, it, vi } from "vitest";
import {
  buildAgentStatusMap,
  parseAgentInstanceUpdateRequest,
  readAgentInstance,
  readAgentStatuses,
  updateAgentInstance,
  type AgentAdminRepository,
} from "@/modules/agents/admin";

function repository(overrides: Partial<AgentAdminRepository> = {}): AgentAdminRepository {
  return {
    getBySlug: vi.fn(async () => ({ data: null, errorMessage: null })),
    updateBySlug: vi.fn(async () => ({ data: null, errorMessage: null })),
    listStatuses: vi.fn(async () => ({ data: null, error: null })),
    recordActivity: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("agent admin compatibility", () => {
  it("keeps the instance read success and not-found contracts", async () => {
    const row = { slug: "operations", enabled: true, settings: { tone: "brief" } };
    const found = repository({ getBySlug: vi.fn(async () => ({ data: row, errorMessage: null })) });
    await expect(readAgentInstance("operations", found)).resolves.toEqual({ kind: "found", data: row });
    expect(found.getBySlug).toHaveBeenCalledWith("operations");

    const missing = repository({ getBySlug: vi.fn(async () => ({ data: null, errorMessage: "row missing" })) });
    await expect(readAgentInstance("missing", missing)).resolves.toEqual({ kind: "not-found", message: "row missing" });
  });

  it("keeps timestamp-only PATCH updates and accepts only enabled/settings", () => {
    expect(parseAgentInstanceUpdateRequest({ enabled: false, settings: { tone: "brief" } }, "now")).toEqual({
      update: { updated_at: "now", enabled: false, settings: { tone: "brief" } },
      enabledChanged: true,
      settingsChanged: true,
    });
    expect(parseAgentInstanceUpdateRequest({ enabled: "false", settings: null }, "now")).toEqual({
      update: { updated_at: "now" },
      enabledChanged: false,
      settingsChanged: false,
    });
  });

  it("keeps successful update activity ordering and failure activity", async () => {
    const success = repository({
      updateBySlug: vi.fn(async () => ({ data: { slug: "operations", enabled: true }, errorMessage: null })),
    });
    await expect(
      updateAgentInstance("operations", { enabled: true, settings: { tone: "brief" } }, success, "now")
    ).resolves.toEqual({ kind: "updated", data: { slug: "operations", enabled: true } });
    expect(success.updateBySlug).toHaveBeenCalledWith("operations", {
      updated_at: "now",
      enabled: true,
      settings: { tone: "brief" },
    });
    expect(success.recordActivity).toHaveBeenNthCalledWith(1, {
      agent_slug: "operations",
      summary: "Agent 已啟用",
      status: "success",
    });
    expect(success.recordActivity).toHaveBeenNthCalledWith(2, {
      agent_slug: "operations",
      summary: "已更新 Agent 設定",
      status: "success",
    });

    const failed = repository({ updateBySlug: vi.fn(async () => ({ data: null, errorMessage: "permission denied" })) });
    await expect(updateAgentInstance("operations", {}, failed, "now")).resolves.toEqual({
      kind: "error",
      message: "permission denied",
    });
    expect(failed.recordActivity).toHaveBeenCalledWith({
      agent_slug: "operations",
      summary: "更新設定失敗：permission denied",
      status: "failed",
    });
  });

  it("keeps database status precedence and static fallback", async () => {
    const catalog = [
      { slug: "active", status: "active" },
      { slug: "draft", status: "draft" },
    ];
    expect(buildAgentStatusMap(catalog, [{ slug: "active", enabled: 0 }, { slug: "external", enabled: "yes" }])).toEqual({
      active: false,
      external: true,
      draft: false,
    });

    const unavailable = repository({ listStatuses: vi.fn(async () => { throw new Error("unavailable"); }) });
    await expect(readAgentStatuses(unavailable, catalog)).resolves.toEqual({ enabled: { active: true, draft: false } });
  });
});
