import type { DeliveryRequest } from "@/platform/artifacts/contracts";
import type { EventEnvelope } from "@/platform/events/contracts";
import type { OutboxRecord, RunRecord, RunTransition } from "@/platform/runtime/contracts";
import type { OutboxRepository, RuntimeRepository } from "@/platform/runtime/repositories";
import { StaleRunVersionError, transitionRun } from "@/platform/runtime/state-machine";

export interface RuntimeKernelDependencies {
  runtime: RuntimeRepository;
  outbox: OutboxRepository;
  now: () => string;
  id: () => string;
}

export class RuntimeKernel {
  constructor(private readonly dependencies: RuntimeKernelDependencies) {}

  async acceptEvent(params: {
    event: EventEnvelope;
    workflowId: string;
    workflowVersion: number;
    agentInstanceId: string;
    deploymentId: string;
  }): Promise<{ duplicate: boolean; run: RunRecord }> {
    const runId = this.dependencies.id();
    const now = this.dependencies.now();
    const run: RunRecord = {
      id: runId,
      workflowId: params.workflowId,
      workflowVersion: params.workflowVersion,
      agentInstanceId: params.agentInstanceId,
      deploymentId: params.deploymentId,
      correlationId: params.event.correlationId,
      idempotencyKey: params.event.idempotencyKey,
      state: "queued",
      stateVersion: 0,
      createdAt: now,
      updatedAt: now,
    };
    const admitted = await this.dependencies.runtime.admit(run, { envelope: params.event, runId });
    return { duplicate: !admitted.inserted, run: admitted.run };
  }

  async transition(runId: string, transition: Omit<RunTransition, "expectedVersion"> & { expectedVersion: number }) {
    const current = await this.dependencies.runtime.get(runId);
    if (!current) throw new Error(`Run ${runId} does not exist`);
    const next = transitionRun(current, transition);
    if (!(await this.dependencies.runtime.compareAndSwap(transition.expectedVersion, next))) {
      throw new StaleRunVersionError(`Run ${runId} changed before transition could be saved`);
    }
    return next;
  }

  async requestDelivery(params: {
    runId: string;
    idempotencyKey: string;
    request: DeliveryRequest;
  }): Promise<{ duplicate: boolean; record: OutboxRecord }> {
    const now = this.dependencies.now();
    const result = await this.dependencies.outbox.enqueueUnique({
      id: this.dependencies.id(),
      runId: params.runId,
      idempotencyKey: params.idempotencyKey,
      request: params.request,
      state: "pending",
      attempt: 0,
      availableAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return { duplicate: !result.inserted, record: result.record };
  }
}
