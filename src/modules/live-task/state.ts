export type LiveTaskStatus = "active" | "waiting" | "done";

export interface LiveTaskStateSnapshot {
  step: number;
  status: LiveTaskStatus;
  caption: string | null;
  hasImage: boolean;
  imageVersion: number;
  updatedAt: number;
}

export interface LiveTaskStepSnapshot {
  runId: string;
  nodeId: string;
  status: string;
  outputSummary: string | null;
  startedAt: string;
}

export interface LiveTaskUpdatePatch {
  step: number;
  status: LiveTaskStatus;
  caption?: string;
  image?: string;
}

export interface LiveTaskStateRepository {
  getTaskState(agentSlug: string): Promise<LiveTaskStateSnapshot | null>;
  getCurrentStep(agentSlug: string): Promise<LiveTaskStepSnapshot | null>;
  /** Optional run/node-scoped image projection; never read from another run's shared state. */
  getStepImage?(step: LiveTaskStepSnapshot): Promise<string | null>;
  setState(agentSlug: string, patch: LiveTaskUpdatePatch): Promise<void>;
  getImage(agentSlug: string): Promise<string | null>;
}

export interface LiveTaskReadRequest {
  agentSlug: string;
}

export function parseLiveTaskReadRequest(agent: unknown): LiveTaskReadRequest {
  return { agentSlug: typeof agent === "string" ? agent : "" };
}

export type LiveTaskReadResult =
  | { kind: "inactive" }
  | {
      kind: "active";
      response: {
        active: true;
        nodeId: string | null;
        runId: string | null;
        step: number;
        status: LiveTaskStatus;
        caption: string | null;
        hasImage: boolean;
        imageVersion: number;
        updatedAt: number;
        /** Trusted remote image attached to the same run/node as the current step. */
        imageUrl?: string;
      };
    };

function normalizeStepStatus(status: string): LiveTaskStatus {
  return status === "waiting" ? "waiting" : status === "done" ? "done" : "active";
}

export async function readLiveTask(
  input: LiveTaskReadRequest,
  repository: Pick<LiveTaskStateRepository, "getTaskState" | "getCurrentStep" | "getStepImage">,
): Promise<LiveTaskReadResult> {
  const [task, step] = await Promise.all([
    repository.getTaskState(input.agentSlug),
    repository.getCurrentStep(input.agentSlug),
  ]);
  if (!task && !step) return { kind: "inactive" };

  const status = step ? normalizeStepStatus(step.status) : task?.status;
  let imageUrl: string | null = null;
  if (step && repository.getStepImage) {
    try {
      imageUrl = await repository.getStepImage(step);
    } catch {
      // A projection image is optional; keep the text/status response available.
    }
  }
  // agent_live_task is one shared row per Agent and may still contain a business-card
  // image while a research run is active. Research must never borrow that image.
  const isResearchStep = step?.nodeId.startsWith("research-") ?? false;
  const hasImage = isResearchStep ? Boolean(imageUrl) : task?.hasImage ?? false;
  const imageVersion = isResearchStep ? 0 : task?.imageVersion ?? 0;
  const stepUpdatedAt = step ? Date.parse(step.startedAt) : Number.NaN;
  const updatedAt = Number.isFinite(stepUpdatedAt)
    ? stepUpdatedAt
    : task?.updatedAt ?? Date.now();
  return {
    kind: "active",
    response: {
      active: true,
      nodeId: step?.nodeId ?? null,
      runId: step?.runId ?? null,
      step: task?.step ?? 0,
      status: status ?? "active",
      caption: step?.outputSummary ?? task?.caption ?? null,
      hasImage,
      imageVersion,
      updatedAt,
      ...(imageUrl ? { imageUrl } : {}),
    },
  };
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

export type LiveTaskUpdateResult =
  | { kind: "invalid"; message: "missing agent" }
  | { kind: "ok" };

export async function updateLiveTask(
  input: LiveTaskUpdateRequest,
  repository: Pick<LiveTaskStateRepository, "setState">,
): Promise<LiveTaskUpdateResult> {
  if (!input.agentSlug) return { kind: "invalid", message: "missing agent" };
  await repository.setState(input.agentSlug, input.patch);
  return { kind: "ok" };
}

export interface LiveTaskImageRequest {
  agentSlug: string;
}

export interface LiveTaskImageDescriptor {
  contentType: string;
  base64: string;
}

export function parseLiveTaskImageRequest(agent: unknown): LiveTaskImageRequest {
  return { agentSlug: typeof agent === "string" ? agent : "" };
}

export function parseLiveTaskImageDataUrl(image: string | null): LiveTaskImageDescriptor | null {
  if (!image) return null;
  const match = /^data:([^;]+);base64,([\s\S]*)$/.exec(image);
  if (!match) return null;
  return { contentType: match[1], base64: match[2] };
}

export type LiveTaskImageResult =
  | { kind: "not-found" }
  | { kind: "ok"; contentType: string; base64: string };

export async function readLiveTaskImage(
  input: LiveTaskImageRequest,
  repository: Pick<LiveTaskStateRepository, "getImage">,
): Promise<LiveTaskImageResult> {
  const descriptor = parseLiveTaskImageDataUrl(await repository.getImage(input.agentSlug));
  if (!descriptor) return { kind: "not-found" };
  return { kind: "ok", ...descriptor };
}
