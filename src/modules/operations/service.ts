export interface ActivityReadRequest {
  agentSlug: string | null;
  status: string | null;
  limit: number;
}

export interface ContactTagPort {
  list(): Promise<string[]>;
  add(contactId: string, tag: string): Promise<string[]>;
}

export interface OperationsStorageResult {
  data: unknown;
  error: { message: string } | null;
}

export interface OperationsRepository extends ContactTagPort {
  listContacts(): Promise<OperationsStorageResult>;
  listActivity(input: ActivityReadRequest): Promise<OperationsStorageResult>;
}

export function parseActivityReadRequest(
  status: unknown,
  limit: unknown,
  agentSlug: unknown = null,
): ActivityReadRequest {
  return {
    agentSlug: typeof agentSlug === "string" ? agentSlug : null,
    status: typeof status === "string" ? status : null,
    limit: Number(limit ?? "200"),
  };
}

export function parseAgentActivityReadRequest(agentSlug: unknown): ActivityReadRequest {
  return parseActivityReadRequest(null, "20", agentSlug);
}

export function createOperationsService(repository: OperationsRepository) {
  const result = ({ data, error }: OperationsStorageResult) =>
    error
      ? { kind: "error" as const, message: error.message }
      : { kind: "ok" as const, data };

  return {
    async readContacts() {
      return result(await repository.listContacts());
    },

    async readActivity(input: ActivityReadRequest) {
      return result(await repository.listActivity(input));
    },
  };
}
