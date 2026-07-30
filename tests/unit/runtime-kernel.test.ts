import { describe, expect, it } from "vitest";
import type { EventEnvelope } from "@/platform/events/contracts";
import type { OutboxRecord, RunRecord } from "@/platform/runtime/contracts";
import {
  InMemoryOutboxRepository,
  InMemoryRuntimeRepository,
} from "@/platform/runtime/in-memory";
import { RuntimeKernel } from "@/platform/runtime/kernel";
import { completeDelivery, failDelivery, InvalidOutboxTransitionError } from "@/platform/runtime/outbox-state";
import {
  InvalidRunTransitionError,
  StaleRunVersionError,
  transitionRun,
} from "@/platform/runtime/state-machine";

const at = "2026-07-31T00:00:00.000Z";

function run(overrides: Partial<RunRecord> = {}): RunRecord {
  return {
    id: "run-1",
    workflowId: "visit",
    workflowVersion: 1,
    agentInstanceId: "coco-prod",
    deploymentId: "prod",
    correlationId: "line-user-1",
    idempotencyKey: "line-message-1",
    state: "queued",
    stateVersion: 0,
    createdAt: at,
    updatedAt: at,
    ...overrides,
  };
}

function event(idempotencyKey = "line-message-1"): EventEnvelope {
  return {
    schemaVersion: "1.0",
    eventId: "event-1",
    eventType: "visit.card.received",
    occurredAt: at,
    source: { kind: "webhook", id: "line-primary" },
    correlationId: "line-user-1",
    idempotencyKey,
    payload: { messageId: "message-1" },
  };
}

function kernel() {
  let nextId = 0;
  const repository = new InMemoryRuntimeRepository();
  const outbox = new InMemoryOutboxRepository();
  return {
    repository,
    outbox,
    runtime: new RuntimeKernel({
      runtime: repository,
      outbox,
      now: () => at,
      id: () => `generated-${++nextId}`,
    }),
  };
}

describe("run state machine", () => {
  it("supports wait, resume, retry, and success without mutating prior records", () => {
    const queued = run();
    const running = transitionRun(queued, { to: "running", expectedVersion: 0, at });
    const waiting = transitionRun(running, { to: "waiting_input", expectedVersion: 1, at });
    const resumed = transitionRun(waiting, { to: "running", expectedVersion: 2, at });
    const retrying = transitionRun(resumed, { to: "retrying", expectedVersion: 3, at });
    const retried = transitionRun(retrying, { to: "running", expectedVersion: 4, at });
    const succeeded = transitionRun(retried, {
      to: "succeeded",
      expectedVersion: 5,
      at,
      output: { inviteId: "invite-1" },
    });

    expect(queued.state).toBe("queued");
    expect(succeeded).toMatchObject({ state: "succeeded", stateVersion: 6, output: { inviteId: "invite-1" } });
  });

  it("rejects illegal and stale transitions", () => {
    expect(() => transitionRun(run(), { to: "succeeded", expectedVersion: 0, at })).toThrow(
      InvalidRunTransitionError
    );
    expect(() => transitionRun(run(), { to: "running", expectedVersion: 3, at })).toThrow(StaleRunVersionError);
    expect(() =>
      transitionRun(run({ state: "succeeded", stateVersion: 2 }), {
        to: "running",
        expectedVersion: 2,
        at,
      })
    ).toThrow(InvalidRunTransitionError);
  });
});

describe("runtime kernel", () => {
  it("maps duplicate inbound events to one run", async () => {
    const { runtime, repository } = kernel();
    const first = await runtime.acceptEvent({
      event: event(),
      workflowId: "visit",
      workflowVersion: 1,
      agentInstanceId: "coco-prod",
      deploymentId: "prod",
    });
    const duplicate = await runtime.acceptEvent({
      event: event(),
      workflowId: "visit",
      workflowVersion: 1,
      agentInstanceId: "coco-prod",
      deploymentId: "prod",
    });

    expect(first.duplicate).toBe(false);
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.run.id).toBe(first.run.id);
    expect(await repository.listEvents()).toHaveLength(1);
  });

  it("atomically maps concurrent duplicate events to one run", async () => {
    const { runtime, repository } = kernel();
    const accept = () =>
      runtime.acceptEvent({
        event: event(),
        workflowId: "visit",
        workflowVersion: 1,
        agentInstanceId: "coco-prod",
        deploymentId: "prod",
      });
    const results = await Promise.all([accept(), accept()]);

    expect(results.filter((result) => !result.duplicate)).toHaveLength(1);
    expect(new Set(results.map((result) => result.run.id))).toHaveLength(1);
    expect(await repository.listEvents()).toHaveLength(1);
  });

  it("allows only one live run lease owner", async () => {
    const runs = new InMemoryRuntimeRepository();
    await runs.create(run());

    const first = await runs.claim("run-1", "worker-a", at, "2026-07-31T00:01:00.000Z");
    const second = await runs.claim("run-1", "worker-b", at, "2026-07-31T00:01:00.000Z");

    expect(first?.lease?.owner).toBe("worker-a");
    expect(second).toBeNull();
  });

  it("deduplicates delivery and prevents a second worker from claiming a live lease", async () => {
    const { runtime, outbox } = kernel();
    const request = {
      channel: "line",
      destination: "line-user-1",
      payload: { text: "ready" },
      artifactIds: ["artifact-1"],
    };
    const first = await runtime.requestDelivery({ runId: "run-1", idempotencyKey: "delivery-1", request });
    const duplicate = await runtime.requestDelivery({ runId: "run-1", idempotencyKey: "delivery-1", request });
    const claimedA = await outbox.claim("worker-a", at, "2026-07-31T00:01:00.000Z", 10);
    const claimedB = await outbox.claim("worker-b", at, "2026-07-31T00:01:00.000Z", 10);

    expect(first.duplicate).toBe(false);
    expect(duplicate.duplicate).toBe(true);
    expect(claimedA).toHaveLength(1);
    expect(claimedB).toHaveLength(0);
  });

  it("preserves explicit retry and dead-letter states", async () => {
    const outbox = new InMemoryOutboxRepository();
    const record: OutboxRecord = {
      id: "delivery-1",
      runId: "run-1",
      idempotencyKey: "delivery-1",
      request: { channel: "gmail", destination: "person@example.test", payload: {}, artifactIds: [] },
      state: "retry",
      attempt: 2,
      availableAt: at,
      createdAt: at,
      updatedAt: at,
      lastError: "provider timeout",
    };
    await outbox.enqueueUnique(record);
    await outbox.save({ ...record, state: "dead_letter", attempt: 3 });

    expect(await outbox.list()).toEqual([expect.objectContaining({ state: "dead_letter", attempt: 3 })]);
  });

  it("moves a leased delivery through retry, reclaim, and dead letter", async () => {
    const { runtime, outbox } = kernel();
    await runtime.requestDelivery({
      runId: "run-1",
      idempotencyKey: "delivery-retry",
      request: { channel: "gmail", destination: "person@example.test", payload: {}, artifactIds: [] },
    });
    const [firstLease] = await outbox.claim("worker-a", at, "2026-07-31T00:01:00.000Z", 1);
    const retry = failDelivery({
      record: firstLease,
      owner: "worker-a",
      at,
      retryAt: at,
      error: "timeout",
      maxAttempts: 2,
    });
    await outbox.save(retry);
    const [secondLease] = await outbox.claim("worker-b", at, "2026-07-31T00:01:00.000Z", 1);
    const dead = failDelivery({
      record: secondLease,
      owner: "worker-b",
      at,
      retryAt: at,
      error: "timeout",
      maxAttempts: 2,
    });

    expect(retry).toMatchObject({ state: "retry", attempt: 1 });
    expect(dead).toMatchObject({ state: "dead_letter", attempt: 2 });
    expect(() => completeDelivery(secondLease, "worker-a", at)).toThrow(InvalidOutboxTransitionError);
  });
});
