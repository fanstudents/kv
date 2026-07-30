export type LiveTaskUpdateStatus = "active" | "waiting" | "done";

export interface LiveTaskUpdatePatch {
  step: number;
  status: LiveTaskUpdateStatus;
  caption?: string;
  image?: string;
}

export interface LiveTaskUpdateRequest {
  agentSlug: string;
  patch: LiveTaskUpdatePatch;
}

export function parseLiveTaskUpdateRequest(payload: unknown): LiveTaskUpdateRequest {
  const body =
    typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  return {
    agentSlug: typeof body.agent === "string" ? body.agent : "",
    patch: {
      step: typeof body.step === "number" ? body.step : 0,
      status: body.status === "done" ? "done" : body.status === "waiting" ? "waiting" : "active",
      caption: typeof body.caption === "string" ? body.caption : undefined,
      image: typeof body.image === "string" ? body.image : undefined,
    },
  };
}
