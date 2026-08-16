import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Database } from "@/lib/database.types";
import { finishRun, logStep } from "@/lib/agent-runs";
import {
  createStagingMainDatabaseClient,
  requireStagingMainDatabaseEnvironment,
} from "./staging-main-db";

const FIXTURE_PREFIX = "codex-agent-run-cost-staging-db:";
const acceptanceEnabled = process.env.AGENT_RUN_COST_STAGING_DB_ACCEPTANCE === "1";
const triggerRef = `${FIXTURE_PREFIX}${randomUUID()}`;
let stagingClient: SupabaseClient<Database> | null = null;
let runId: string | null = null;

beforeAll(async () => {
  if (!acceptanceEnabled) return;
  const environment = requireStagingMainDatabaseEnvironment(
    "AGENT_RUN_COST_STAGING_DB_ACCEPTANCE",
    "npm run test:integration:agent-run-cost:staging",
  );
  stagingClient = createStagingMainDatabaseClient(environment);

  const { data, error } = await stagingClient
    .from("agent_runs")
    .insert({
      agent_slug: "visit",
      trigger: "manual",
      trigger_ref: triggerRef,
      summary: "Codex atomic run cost staging fixture",
    })
    .select("id")
    .single();
  if (error) throw new Error(`Agent run cost staging fixture setup failed: ${error.message}`);
  runId = data.id;
});

afterAll(async () => {
  if (!stagingClient || !runId) return;

  const cleanupErrors: string[] = [];
  const { error: stepsError } = await stagingClient
    .from("agent_run_steps")
    .delete()
    .eq("run_id", runId);
  if (stepsError) cleanupErrors.push(`steps: ${stepsError.message}`);

  const { error: runError } = await stagingClient
    .from("agent_runs")
    .delete()
    .eq("id", runId)
    .eq("trigger_ref", triggerRef);
  if (runError) cleanupErrors.push(`run: ${runError.message}`);

  if (cleanupErrors.length > 0) {
    throw new Error(`Agent run cost staging cleanup failed: ${cleanupErrors.join("; ")}`);
  }
});

(acceptanceEnabled ? describe : describe.skip)("Agent run cost staging Main DB behavior", () => {
  it("preserves every concurrent usage increment without losing a write", async () => {
    const client = stagingClient;
    const fixtureRunId = runId;
    if (!client || !fixtureRunId) {
      throw new Error("Agent run cost staging fixture did not initialize");
    }

    const increments = 20;
    await Promise.all(
      Array.from({ length: increments }, (_, index) =>
        logStep(fixtureRunId, `atomic-cost-${index}`, {
          status: "done",
          tokens: 3,
          costUsd: 0.01,
        }),
      ),
    );

    const { data: run, error: runReadError } = await client
      .from("agent_runs")
      .select("cost_usd,total_tokens")
      .eq("id", fixtureRunId)
      .single();
    expect(runReadError).toBeNull();
    expect(run?.total_tokens).toBe(increments * 3);
    expect(Number(run?.cost_usd)).toBeCloseTo(increments * 0.01);

    const { count, error: stepsReadError } = await client
      .from("agent_run_steps")
      .select("id", { count: "exact", head: true })
      .eq("run_id", fixtureRunId);
    expect(stepsReadError).toBeNull();
    expect(count).toBe(increments);
  });

  it("closes open steps when the run reaches a terminal status", async () => {
    const client = stagingClient;
    const fixtureRunId = runId;
    if (!client || !fixtureRunId) {
      throw new Error("Agent run cost staging fixture did not initialize");
    }

    await Promise.all([
      logStep(fixtureRunId, "terminal-running", { status: "running" }),
      logStep(fixtureRunId, "terminal-waiting", { status: "waiting" }),
    ]);
    await finishRun(fixtureRunId, { status: "success", summary: "Codex terminal ledger staging fixture" });

    const [{ data: run, error: runReadError }, { data: steps, error: stepsReadError }] = await Promise.all([
      client
        .from("agent_runs")
        .select("status,summary,ended_at")
        .eq("id", fixtureRunId)
        .single(),
      client
        .from("agent_run_steps")
        .select("node_id,status,ended_at")
        .eq("run_id", fixtureRunId)
        .in("node_id", ["terminal-running", "terminal-waiting"]),
    ]);

    expect(runReadError).toBeNull();
    expect(run).toMatchObject({ status: "success", summary: "Codex terminal ledger staging fixture" });
    expect(run?.ended_at).toBeTruthy();
    expect(stepsReadError).toBeNull();
    expect(steps).toHaveLength(2);
    expect(steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ node_id: "terminal-running", status: "done" }),
        expect.objectContaining({ node_id: "terminal-waiting", status: "done" }),
      ]),
    );
    expect(steps?.every((step) => Boolean(step.ended_at))).toBe(true);
  });
});
