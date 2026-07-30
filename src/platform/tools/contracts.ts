export interface ActivityContext {
  runId: string;
  stepId: string;
  attempt: number;
  idempotencyKey: string;
  signal: AbortSignal;
}

export interface ActivityResult<TOutput = unknown> {
  output: TOutput;
  artifactIds?: string[];
}

export type ActivityHandler<TInput = unknown, TOutput = unknown> = (
  input: TInput,
  context: ActivityContext
) => Promise<ActivityResult<TOutput>>;

export interface ToolDefinition {
  id: string;
  version: number;
  description: string;
  capabilityId: string;
  inputSchemaId: string;
  outputSchemaId: string;
  sideEffect: "none" | "read" | "write";
  requiresApproval: boolean;
}
