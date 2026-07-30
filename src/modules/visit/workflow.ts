import type { WorkflowDefinition } from "@/platform/workflows/contracts";
import { validateWorkflowDefinition } from "@/platform/workflows/composition";

export const VISIT_WORKFLOW = validateWorkflowDefinition({
  id: "visit",
  version: 1,
  name: "Coco Visit",
  entryNodeId: "parse-card",
  nodes: [
    {
      id: "parse-card",
      kind: "activity",
      activityId: "visit.card.parse",
      transitions: { recognized: "visit-decision", unrecognized: "failed", no_email: "done" },
    },
    {
      id: "visit-decision",
      kind: "wait-approval",
      transitions: { confirm: "prepare-invite", decline: "cancelled", timeout: "cancelled", correct: "visit-decision" },
    },
    {
      id: "prepare-invite",
      kind: "activity",
      activityId: "visit.invite.prepare",
      transitions: { approval: "invite-approval", direct: "deliver-invite", failed: "failed" },
    },
    {
      id: "invite-approval",
      kind: "wait-approval",
      transitions: { approve: "deliver-invite", revise: "invite-approval", cancel: "cancelled" },
    },
    {
      id: "deliver-invite",
      kind: "activity",
      activityId: "visit.invite.deliver",
      transitions: { delivered: "contact-response", failed: "failed" },
    },
    {
      id: "contact-response",
      kind: "wait-input",
      transitions: { selected: "location" },
    },
    {
      id: "location",
      kind: "wait-input",
      transitions: { submitted: "fulfil" },
    },
    {
      id: "fulfil",
      kind: "activity",
      activityId: "visit.fulfil",
      transitions: { succeeded: "done", failed: "failed" },
    },
    { id: "done", kind: "end" },
    { id: "failed", kind: "end" },
    { id: "cancelled", kind: "end" },
  ],
} satisfies WorkflowDefinition);
