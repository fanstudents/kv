import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { createGoalsService, goalsService, snapshotMetric } = vi.hoisted(() => {
  const goalsService = {
    read: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    reset: vi.fn(),
    history: vi.fn(),
  };

  return {
    createGoalsService: vi.fn(() => goalsService),
    goalsService,
    snapshotMetric: vi.fn(),
  };
});

vi.mock("@/adapters/goals/supabase-goals-repository", () => ({ supabaseGoalsRepository: {} }));
vi.mock("@/lib/agent-data", () => ({ AGENTS: [{ slug: "support" }] }));
vi.mock("@/lib/agent-memory", () => ({ snapshotMetric }));
vi.mock("@/modules/goals/model", () => ({
  GOAL_METRICS: [
    { id: "metric-a", current: 12 },
    { id: "metric-b", current: 8 },
  ],
}));
vi.mock("@/modules/goals/service", () => ({ createGoalsService }));

import { DELETE, GET, POST, PUT } from "@/app/api/goals/route";
import { GET as getHistory } from "@/app/api/goals/history/route";
import { GET as getMetricSnapshot } from "@/app/api/cron/metric-snapshot/route";

const goal = {
  id: "goal-1",
  agentSlug: "support",
  metricId: "metric-a",
  target: 24,
  startValue: 4,
  startDate: "2026-08-01",
  dueDate: "2026-08-31",
  cadence: "monthly",
  note: "keep the route contract",
};

const originalCronSecret = process.env.CRON_SECRET;

function request(path: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(`http://localhost${path}`, init);
}

beforeEach(() => {
  vi.clearAllMocks();
  goalsService.read.mockReset();
  goalsService.update.mockReset();
  goalsService.delete.mockReset();
  goalsService.reset.mockReset();
  goalsService.history.mockReset();
  snapshotMetric.mockReset();
  delete process.env.CRON_SECRET;
});

afterEach(() => {
  if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalCronSecret;
});

describe("Goals route contracts", () => {
  it("keeps GET's success and storage-error envelopes", async () => {
    goalsService.read.mockResolvedValueOnce({ kind: "ok", data: [goal] });
    goalsService.read.mockResolvedValueOnce({ kind: "error", message: "storage down" });

    const success = await GET();
    expect(success.status).toBe(200);
    await expect(success.json()).resolves.toEqual({ goals: [goal] });

    const failure = await GET();
    expect(failure.status).toBe(500);
    await expect(failure.json()).resolves.toEqual({ error: "storage down" });
    expect(goalsService.read).toHaveBeenCalledTimes(2);
  });

  it("keeps PUT's success, invalid, and storage-error envelopes", async () => {
    goalsService.update
      .mockResolvedValueOnce({ kind: "ok", goal })
      .mockResolvedValueOnce({ kind: "invalid", message: "invalid goal" })
      .mockResolvedValueOnce({ kind: "error", message: "storage down" });

    const success = await PUT(request("/api/goals", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(goal),
    }));
    expect(success.status).toBe(200);
    await expect(success.json()).resolves.toEqual({ goal });
    expect(goalsService.update).toHaveBeenNthCalledWith(1, { kind: "ok", goal });

    const invalid = await PUT(request("/api/goals", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: "{}",
    }));
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({ error: "invalid goal" });
    expect(goalsService.update).toHaveBeenNthCalledWith(2, expect.objectContaining({ kind: "invalid" }));

    const failure = await PUT(request("/api/goals", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(goal),
    }));
    expect(failure.status).toBe(500);
    await expect(failure.json()).resolves.toEqual({ error: "storage down" });
  });

  it("keeps DELETE's success, invalid, and storage-error envelopes", async () => {
    goalsService.delete
      .mockResolvedValueOnce({ kind: "ok" })
      .mockResolvedValueOnce({ kind: "invalid", message: "missing id" })
      .mockResolvedValueOnce({ kind: "error", message: "storage down" });

    const success = await DELETE(request("/api/goals?id=goal-1", { method: "DELETE" }));
    expect(success.status).toBe(200);
    await expect(success.json()).resolves.toEqual({ ok: true });
    expect(goalsService.delete).toHaveBeenNthCalledWith(1, { kind: "ok", id: "goal-1" });

    const invalid = await DELETE(request("/api/goals", { method: "DELETE" }));
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({ error: "missing id" });
    expect(goalsService.delete).toHaveBeenNthCalledWith(2, expect.objectContaining({ kind: "invalid" }));

    const failure = await DELETE(request("/api/goals?id=goal-1", { method: "DELETE" }));
    expect(failure.status).toBe(500);
    await expect(failure.json()).resolves.toEqual({ error: "storage down" });
  });

  it("keeps POST reset's success and storage-error envelopes", async () => {
    goalsService.reset
      .mockResolvedValueOnce({ kind: "ok", data: [goal] })
      .mockResolvedValueOnce({ kind: "error", message: "storage down" });

    const success = await POST();
    expect(success.status).toBe(200);
    await expect(success.json()).resolves.toEqual({ goals: [goal] });

    const failure = await POST();
    expect(failure.status).toBe(500);
    await expect(failure.json()).resolves.toEqual({ error: "storage down" });
  });

  it("keeps history's success, invalid, and storage-error envelopes", async () => {
    const points = [{ metric_id: "metric-a", value: 12, captured_at: "2026-08-02T00:00:00.000Z" }];
    goalsService.history
      .mockResolvedValueOnce({ kind: "ok", points })
      .mockResolvedValueOnce({ kind: "invalid", message: "missing metric" })
      .mockResolvedValueOnce({ kind: "error", message: "storage down" });

    const success = await getHistory(request("/api/goals/history?metricId=metric-a&days=14"));
    expect(success.status).toBe(200);
    await expect(success.json()).resolves.toEqual({ points });
    expect(goalsService.history).toHaveBeenNthCalledWith(1, { metricId: "metric-a", days: 14 });

    const invalid = await getHistory(request("/api/goals/history"));
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toEqual({ error: "missing metric" });
    expect(goalsService.history).toHaveBeenNthCalledWith(2, { metricId: null, days: 30 });

    const failure = await getHistory(request("/api/goals/history?metricId=metric-a"));
    expect(failure.status).toBe(500);
    await expect(failure.json()).resolves.toEqual({ error: "storage down" });
  });

  it("fails closed before snapshots and keeps the authorized metric count", async () => {
    const missing = await getMetricSnapshot(request("/api/cron/metric-snapshot"));
    expect(missing.status).toBe(503);
    await expect(missing.json()).resolves.toEqual({ error: "server misconfigured: CRON_SECRET not set" });

    process.env.CRON_SECRET = "cron-secret";
    const wrong = await getMetricSnapshot(request("/api/cron/metric-snapshot", {
      headers: { "x-cron-key": "wrong-secret" },
    }));
    expect(wrong.status).toBe(401);
    await expect(wrong.json()).resolves.toEqual({ error: "unauthorized" });
    expect(snapshotMetric).not.toHaveBeenCalled();

    snapshotMetric.mockResolvedValue(undefined);
    const authorized = await getMetricSnapshot(request("/api/cron/metric-snapshot", {
      headers: { "x-cron-key": "cron-secret" },
    }));
    expect(authorized.status).toBe(200);
    await expect(authorized.json()).resolves.toEqual({ ok: true, metrics: 2 });
    expect(snapshotMetric).toHaveBeenNthCalledWith(1, {
      metricId: "metric-a",
      value: 12,
      source: "demo",
    });
    expect(snapshotMetric).toHaveBeenNthCalledWith(2, {
      metricId: "metric-b",
      value: 8,
      source: "demo",
    });
  });
});
