import { describe, expect, it } from "vitest";
import type { EventEnvelope } from "@/platform/events/contracts";
import { InMemoryOutboxRepository, InMemoryRuntimeRepository } from "@/platform/runtime/in-memory";
import { RuntimeKernel } from "@/platform/runtime/kernel";
import type { RunState } from "@/platform/runtime/contracts";

const at = "2026-07-31T00:00:00.000Z";

function harness(profile: string) {
  let id = 0;
  const repository = new InMemoryRuntimeRepository();
  const runtime = new RuntimeKernel({
    runtime: repository,
    outbox: new InMemoryOutboxRepository(),
    now: () => at,
    id: () => `${profile}-${++id}`,
  });
  const event: EventEnvelope = {
    schemaVersion: "1.0",
    eventId: `${profile}-event`,
    eventType: `${profile}.received`,
    occurredAt: at,
    source: { kind: profile === "scheduled-batch" ? "schedule" : "http", id: profile },
    correlationId: `${profile}-correlation`,
    idempotencyKey: `${profile}-idempotency`,
    payload: {},
  };
  return { runtime, repository, event };
}

async function simulate(profile: string, states: RunState[]) {
  const { runtime, event } = harness(profile);
  let { run } = await runtime.acceptEvent({
    event,
    workflowId: `${profile}-workflow`,
    workflowVersion: 1,
    agentInstanceId: "coco-prod",
    deploymentId: "test",
  });
  for (const state of states) {
    run = await runtime.transition(run.id, { to: state, expectedVersion: run.stateVersion, at });
  }
  return run;
}

describe("finite runtime execution profiles", () => {
  it("simulates request/response completion", async () => {
    await expect(simulate("request-response", ["running", "succeeded"])).resolves.toMatchObject({
      state: "succeeded",
      stateVersion: 2,
    });
  });

  it("simulates a deduplicated short event", async () => {
    const { runtime, repository, event } = harness("short-event");
    const [first, duplicate] = await Promise.all([
      runtime.acceptEvent({
        event,
        workflowId: "short-event-workflow",
        workflowVersion: 1,
        agentInstanceId: "coco-prod",
        deploymentId: "test",
      }),
      runtime.acceptEvent({
        event,
        workflowId: "short-event-workflow",
        workflowVersion: 1,
        agentInstanceId: "coco-prod",
        deploymentId: "test",
      }),
    ]);

    expect([first, duplicate].filter((result) => result.duplicate)).toHaveLength(1);
    expect(await repository.listEvents()).toHaveLength(1);
  });

  it("simulates a long-lived wait and resume", async () => {
    await expect(
      simulate("long-lived-event", ["running", "waiting_input", "running", "succeeded"])
    ).resolves.toMatchObject({ state: "succeeded", stateVersion: 4 });
  });

  it("simulates scheduled retry and recovery", async () => {
    await expect(
      simulate("scheduled-batch", ["running", "retrying", "running", "succeeded"])
    ).resolves.toMatchObject({ state: "succeeded", stateVersion: 4 });
  });
});
