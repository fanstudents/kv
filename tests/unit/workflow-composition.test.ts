import { describe, expect, it } from "vitest";
import type { AgentInstance, WorkflowDefinition } from "@/platform/workflows/contracts";
import {
  AmbiguousWorkflowBindingError,
  InvalidWorkflowDefinitionError,
  selectWorkflowBinding,
  validateWorkflowDefinition,
} from "@/platform/workflows/composition";

const workflow: WorkflowDefinition = {
  id: "visit",
  version: 1,
  name: "Visit",
  entryNodeId: "parse-card",
  nodes: [
    { id: "parse-card", kind: "activity", activityId: "card.parse", next: "approval" },
    { id: "approval", kind: "wait-approval", next: "send" },
    { id: "send", kind: "activity", activityId: "invite.send", next: "done" },
    { id: "done", kind: "end" },
  ],
};

const instance: AgentInstance = {
  id: "coco-prod",
  roleTemplateId: "business-development",
  roleTemplateVersion: 3,
  deploymentId: "prod",
  enabled: true,
  bindings: [
    {
      workflowId: "visit",
      workflowVersion: 1,
      triggerIds: ["line.image", "operator.visit"],
      executionProfile: "long-lived-event",
    },
    {
      workflowId: "visit-timeout",
      workflowVersion: 1,
      triggerIds: ["cron.visit-timeout"],
      executionProfile: "scheduled-batch",
    },
    {
      workflowId: "visit-preview",
      workflowVersion: 1,
      triggerIds: ["http.visit-preview"],
      executionProfile: "request-response",
    },
    {
      workflowId: "visit-research",
      workflowVersion: 1,
      triggerIds: ["event.visit-confirmed"],
      executionProfile: "short-event",
    },
    {
      workflowId: "meeting-live",
      workflowVersion: 1,
      triggerIds: ["realtime.meeting"],
      executionProfile: "realtime-session",
    },
    {
      workflowId: "support-relay",
      workflowVersion: 1,
      triggerIds: ["legacy.support"],
      executionProfile: "legacy-relay",
    },
  ],
};

describe("workflow composition", () => {
  it("validates a finite versioned workflow graph", () => {
    expect(validateWorkflowDefinition(workflow)).toBe(workflow);
  });

  it("rejects malformed graph references instead of inventing runtime behavior", () => {
    expect(() =>
      validateWorkflowDefinition({
        ...workflow,
        nodes: [{ id: "start", kind: "activity", activityId: "card.parse", next: "missing" }],
      })
    ).toThrow(InvalidWorkflowDefinitionError);
  });

  it("binds four execution profiles to one Agent instance without creating Agent subtypes", () => {
    expect(selectWorkflowBinding(instance, "line.image")).toMatchObject({
      workflowId: "visit",
      executionProfile: "long-lived-event",
    });
    expect(selectWorkflowBinding(instance, "cron.visit-timeout")).toMatchObject({
      workflowId: "visit-timeout",
      executionProfile: "scheduled-batch",
    });
    expect(selectWorkflowBinding(instance, "http.visit-preview")).toMatchObject({
      workflowId: "visit-preview",
      executionProfile: "request-response",
    });
    expect(selectWorkflowBinding(instance, "event.visit-confirmed")).toMatchObject({
      workflowId: "visit-research",
      executionProfile: "short-event",
    });
    expect(selectWorkflowBinding(instance, "realtime.meeting")?.executionProfile).toBe("realtime-session");
    expect(selectWorkflowBinding(instance, "legacy.support")?.executionProfile).toBe("legacy-relay");
  });

  it("rejects ambiguous trigger ownership", () => {
    expect(() =>
      selectWorkflowBinding(
        {
          ...instance,
          bindings: [
            ...instance.bindings,
            {
              workflowId: "duplicate",
              workflowVersion: 1,
              triggerIds: ["line.image"],
              executionProfile: "short-event",
            },
          ],
        },
        "line.image"
      )
    ).toThrow(AmbiguousWorkflowBindingError);
  });
});
