import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabase, metricHistory } = vi.hoisted(() => ({
  getSupabase: vi.fn(),
  metricHistory: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase", () => ({ getSupabase }));
vi.mock("@/lib/agent-memory", () => ({ metricHistory }));

import { DEFAULT_GOALS, type AgentGoal } from "@/lib/agent-goals";
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
    getSupabase.mockReturnValue({ from });

    await expect(supabaseGoalsRepository.list()).resolves.toEqual([goal]);
    expect(from).toHaveBeenCalledWith("agent_goals");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: true });
  });

  it("seeds defaults when storage is empty", async () => {
    const order = vi.fn().mockResolvedValue({ data: [] });
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({ select: () => ({ order }), insert }));
    getSupabase.mockReturnValue({ from });

    await expect(supabaseGoalsRepository.list()).resolves.toEqual(DEFAULT_GOALS);
    expect(insert).toHaveBeenCalledOnce();
    expect(insert.mock.calls[0][0]).toHaveLength(DEFAULT_GOALS.length);
  });

  it("upserts the existing storage shape and propagates provider errors", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    getSupabase.mockReturnValue({ from: () => ({ upsert }) });

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
    const neq = vi.fn().mockResolvedValue({ error: null });
    const insert = vi.fn().mockResolvedValue({ error: null });
    const deleteQuery = vi.fn()
      .mockReturnValueOnce({ eq })
      .mockReturnValueOnce({ neq });
    const from = vi.fn(() => ({ delete: deleteQuery, insert }));
    getSupabase.mockReturnValue({ from });

    await expect(supabaseGoalsRepository.remove("goal-1")).resolves.toBeUndefined();
    expect(eq).toHaveBeenCalledWith("id", "goal-1");

    await expect(supabaseGoalsRepository.reset()).resolves.toEqual(DEFAULT_GOALS);
    expect(neq).toHaveBeenCalledWith("id", "");
    expect(insert).toHaveBeenCalledOnce();
  });

  it("uses the shared metric history owner", async () => {
    const points = [{ metric_id: "gsc-clicks", value: 12, captured_at: "2026-07-31T00:00:00Z" }];
    metricHistory.mockResolvedValue(points);

    await expect(supabaseGoalsRepository.loadHistory("gsc-clicks", 30)).resolves.toEqual(points);
    expect(metricHistory).toHaveBeenCalledWith("gsc-clicks", 30);
  });
});
