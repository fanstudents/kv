import { beforeEach, describe, expect, it, vi } from "vitest";

const { getMainSupabase, metricHistory } = vi.hoisted(() => ({
  getMainSupabase: vi.fn(),
  metricHistory: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({ getMainSupabase }));
vi.mock("@/lib/agent-memory", () => ({ metricHistory }));

import { DEFAULT_GOALS, type AgentGoal } from "@/modules/goals/model";
import { supabaseGoalsRepository } from "@/adapters/goals/supabase-goals-repository";

const goal: AgentGoal = {
  id: "goal-1",
  agentSlug: "support",
  metricId: "support-response",
  target: 3,
  startValue: 0,
  startDate: "2026-07-31",
  dueDate: "2026-08-31",
  cadence: "monthly",
};

beforeEach(() => vi.clearAllMocks());

describe("Supabase Goals repository", () => {
  it("maps stored rows to the existing AgentGoal shape", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [{
        id: "goal-1",
        agent_slug: "support",
        metric_id: "support-response",
        target: "3",
        start_value: "0",
        start_date: "2026-07-31",
        due_date: "2026-08-31",
        cadence: "monthly",
        note: null,
      }],
    });
    const select = vi.fn(() => ({ order }));
    const from = vi.fn(() => ({ select }));
    getMainSupabase.mockReturnValue({ from });

    await expect(supabaseGoalsRepository.list()).resolves.toEqual([goal]);
    expect(from).toHaveBeenCalledWith("agent_goals");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: true });
  });

  it("seeds defaults when storage is empty", async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({ select: () => ({ order }), upsert }));
    getMainSupabase.mockReturnValue({ from });

    await expect(supabaseGoalsRepository.list()).resolves.toEqual(DEFAULT_GOALS);
    expect(upsert).toHaveBeenCalledOnce();
    expect(upsert.mock.calls[0][0]).toHaveLength(DEFAULT_GOALS.length);
    expect(upsert).toHaveBeenCalledWith(expect.any(Array), {
      onConflict: "id",
      ignoreDuplicates: true,
    });
  });

  it("upserts the existing storage shape and propagates provider errors", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    getMainSupabase.mockReturnValue({ from: () => ({ upsert }) });

    await expect(supabaseGoalsRepository.upsert(goal)).resolves.toEqual(goal);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      id: "goal-1",
      agent_slug: "support",
      metric_id: "support-response",
      note: null,
    }));

    upsert.mockResolvedValueOnce({ error: { message: "write failed" } });
    await expect(supabaseGoalsRepository.upsert(goal)).rejects.toThrow("write failed");
  });

  it("removes and resets with the existing query semantics", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const inQuery = vi.fn().mockResolvedValue({ error: null });
    const select = vi.fn().mockResolvedValue({ data: [{ id: "custom-goal" }], error: null });
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const deleteQuery = vi.fn().mockReturnValueOnce({ eq }).mockReturnValueOnce({ in: inQuery });
    const from = vi.fn(() => ({ delete: deleteQuery, select, upsert }));
    getMainSupabase.mockReturnValue({ from });

    await expect(supabaseGoalsRepository.remove("goal-1")).resolves.toBeUndefined();
    expect(eq).toHaveBeenCalledWith("id", "goal-1");

    await expect(supabaseGoalsRepository.reset()).resolves.toEqual(DEFAULT_GOALS);
    expect(select).toHaveBeenCalledWith("id");
    expect(upsert).toHaveBeenCalledWith(expect.any(Array));
    expect(inQuery).toHaveBeenCalledWith("id", ["custom-goal"]);
  });

  it("uses the shared metric history owner", async () => {
    const points = [{ metric_id: "gsc-clicks", value: 12, captured_at: "2026-07-31T00:00:00Z" }];
    metricHistory.mockResolvedValue(points);

    await expect(supabaseGoalsRepository.loadHistory("gsc-clicks", 30)).resolves.toEqual(points);
    expect(metricHistory).toHaveBeenCalledWith("gsc-clicks", 30);
  });

  it("does not hide read, seed, or reset failures", async () => {
    const readOrder = vi.fn().mockResolvedValue({ data: null, error: { message: "read failed" } });
    getMainSupabase.mockReturnValueOnce({ from: () => ({ select: () => ({ order: readOrder }) }) });
    await expect(supabaseGoalsRepository.list()).rejects.toThrow("read failed");

    const seedOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const seed = vi.fn().mockResolvedValue({ error: { message: "seed failed" } });
    getMainSupabase.mockReturnValueOnce({
      from: () => ({ select: () => ({ order: seedOrder }), upsert: seed }),
    });
    await expect(supabaseGoalsRepository.list()).rejects.toThrow("seed failed");

    const resetSelect = vi.fn().mockResolvedValue({ data: null, error: { message: "reset read failed" } });
    const upsert = vi.fn();
    getMainSupabase.mockReturnValueOnce({
      from: () => ({ select: resetSelect, upsert }),
    });
    await expect(supabaseGoalsRepository.reset()).rejects.toThrow("reset read failed");
    expect(upsert).not.toHaveBeenCalled();
  });
});
