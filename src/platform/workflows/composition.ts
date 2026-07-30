import type {
  AgentInstance,
  WorkflowBinding,
  WorkflowDefinition,
  WorkflowNode,
} from "@/platform/workflows/contracts";

export class InvalidWorkflowDefinitionError extends Error {}
export class AmbiguousWorkflowBindingError extends Error {}

function requireNode(nodes: Map<string, WorkflowNode>, id: string, context: string): void {
  if (!nodes.has(id)) throw new InvalidWorkflowDefinitionError(`${context} references missing node ${id}`);
}

export function validateWorkflowDefinition(definition: WorkflowDefinition): WorkflowDefinition {
  const nodes = new Map<string, WorkflowNode>();
  for (const node of definition.nodes) {
    if (nodes.has(node.id)) throw new InvalidWorkflowDefinitionError(`Duplicate workflow node ${node.id}`);
    nodes.set(node.id, node);
  }
  requireNode(nodes, definition.entryNodeId, "Workflow entry");

  for (const node of definition.nodes) {
    if (node.kind === "activity" && !node.activityId) {
      throw new InvalidWorkflowDefinitionError(`Activity node ${node.id} has no activityId`);
    }
    const successors = [node.next, ...Object.values(node.transitions ?? {})].filter(
      (id): id is string => Boolean(id)
    );
    if (node.kind === "end" && successors.length > 0) {
      throw new InvalidWorkflowDefinitionError(`End node ${node.id} cannot have successor nodes`);
    }
    if (node.kind !== "end" && successors.length === 0) {
      throw new InvalidWorkflowDefinitionError(`Node ${node.id} must have at least one successor`);
    }
    for (const successor of successors) requireNode(nodes, successor, `Node ${node.id}`);
  }
  return definition;
}

export function selectWorkflowBinding(instance: AgentInstance, triggerId: string): WorkflowBinding | null {
  if (!instance.enabled) return null;
  const matches = instance.bindings.filter((binding) => binding.triggerIds.includes(triggerId));
  if (matches.length > 1) {
    throw new AmbiguousWorkflowBindingError(
      `Agent instance ${instance.id} has ${matches.length} bindings for trigger ${triggerId}`
    );
  }
  return matches[0] ?? null;
}
