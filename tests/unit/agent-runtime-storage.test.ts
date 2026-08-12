import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getMainSupabase } = vi.hoisted(() => ({ getMainSupabase: vi.fn() }));

vi.mock("@/lib/supabase", () => ({ getMainSupabase }));

import { recall, remember } from "@/lib/agent-memory";
import { logStep, startRun } from "@/lib/agent-runs";

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.useRealTimers());

describe("Agent runtime persistence", () => {
  it("keeps memory defaults and the bounded recall query", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    getMainSupabase.mockReturnValueOnce({ from: vi.fn(() => ({ insert })) });

    await remember({ content: "Customer prefers email", agentSlug: "visit" });

    expect(insert).toHaveBeenCalledWith({
      scope: "agent",
      agent_slug: "visit",
      kind: "episodic",
      content: "Customer prefers email",
      level: 2,
      confidence: 0.6,
      source_run_id: null,
      expires_at: null,
    });

    const rows = [
      {
        id: "memory-1",
        scope: "agent",
        agent_slug: "visit",
        kind: "semantic",
        content: "Prefer concise replies",
        level: 2,
        confidence: 0.8,
        created_at: "2026-08-02T05:00:00.000Z",
        expires_at: null,
      },
    ];
    const response = Promise.resolve({ data: rows });
    const query = {
      select: vi.fn(),
      lte: vi.fn(),
      or: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      in: vi.fn(),
      then: response.then.bind(response),
    };
    query.select.mockReturnValue(query);
    query.lte.mockReturnValue(query);
    query.or.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    query.in.mockReturnValue(query);
    getMainSupabase.mockReturnValueOnce({ from: vi.fn(() => query) });

    await expect(recall({ agentSlug: "visit", maxLevel: 3, limit: 5, kinds: ["semantic"] })).resolves.toEqual(rows);
    expect(query.lte).toHaveBeenCalledWith("level", 3);
    expect(query.in).toHaveBeenCalledWith("kind", ["semantic"]);
    expect(query.limit).toHaveBeenCalledWith(5);
  });

  it("keeps run idempotency before attempting an insert", async () => {
    const existing = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: "run-existing" } }),
    };
    existing.select.mockReturnValue(existing);
    existing.eq.mockReturnValue(existing);
    const from = vi.fn(() => existing);
    getMainSupabase.mockReturnValue({ from });

    await expect(startRun({ agentSlug: "visit", trigger: "webhook", triggerRef: "event-1" })).resolves.toBe(
      "run-existing",
    );
    expect(from).toHaveBeenCalledWith("agent_runs");
    expect(existing.eq).toHaveBeenNthCalledWith(1, "agent_slug", "visit");
    expect(existing.eq).toHaveBeenNthCalledWith(2, "trigger_ref", "event-1");
  });

  it("normalizes runtime metadata exactly as a JSON transport payload", async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: "run-new" }, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const from = vi.fn(() => ({ insert }));
    getMainSupabase.mockReturnValue({ from });

    const runId = await startRun({
      agentSlug: "visit",
      trigger: "manual",
      meta: { requestedAt: new Date("2026-08-02T05:00:00.000Z"), ignored: undefined },
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_slug: "visit",
        trigger: "manual",
        meta: { requestedAt: "2026-08-02T05:00:00.000Z" },
      }),
    );
    expect(runId).toBe("run-new");
  });

  it("keeps terminal-step timestamps and atomically accumulates run usage", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-02T05:00:00.000Z"));
    const stepInsert = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) => {
      if (table === "agent_run_steps") return { insert: stepInsert };
      throw new Error(`Unexpected table: ${table}`);
    });
    getMainSupabase.mockReturnValue({ from, rpc });

    await logStep("run-1", "scan", { status: "done", tokens: 5, costUsd: 0.1 });

    expect(stepInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        run_id: "run-1",
        node_id: "scan",
        status: "done",
        tokens: 5,
        cost_usd: 0.1,
        ended_at: "2026-08-02T05:00:00.000Z",
      }),
    );
    expect(rpc).toHaveBeenCalledWith("add_run_cost", {
      p_run_id: "run-1",
      p_tokens: 5,
      p_cost: 0.1,
    });
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("does not call the usage RPC when a step has no tokens or cost", async () => {
    const stepInsert = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn();
    getMainSupabase.mockReturnValue({
      from: vi.fn(() => ({ insert: stepInsert })),
      rpc,
    });

    await logStep("run-1", "waiting", { status: "waiting" });

    expect(stepInsert).toHaveBeenCalledWith(expect.objectContaining({
      run_id: "run-1",
      node_id: "waiting",
      status: "waiting",
      tokens: 0,
      cost_usd: 0,
      ended_at: null,
    }));
    expect(rpc).not.toHaveBeenCalled();
  });
});
