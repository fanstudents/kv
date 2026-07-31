export type MeetingTurnRole = "boss" | "agent" | "teamlead";

export interface MeetingStartRequest {
  title?: string;
}

export interface MeetingFinishAudio {
  type?: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface MeetingFinishRequest {
  meetingId: string;
  transcript?: string;
  durationSeconds?: number;
  audio?: MeetingFinishAudio;
}

export interface MeetingTurnLogRequest {
  meetingId: string;
  role: MeetingTurnRole;
  content: string;
  agentSlug?: string;
  speaker?: string;
}

export interface MeetingRecordingRequest {
  meetingId: string;
}

export interface MeetingFormLike {
  get(name: string): unknown;
}

export interface MeetingFinishFields {
  transcript?: string;
  durationSeconds?: number;
  recordingPath?: string | null;
}

export interface MeetingStoredTurn {
  role: MeetingTurnRole;
  agentSlug?: string;
  speaker?: string;
  content: string;
}

export interface MeetingSessionRepository {
  create(title?: string): Promise<string | null>;
  appendTurns(meetingId: string, turns: MeetingStoredTurn[]): Promise<void>;
  uploadRecording(
    meetingId: string,
    bytes: ArrayBuffer,
    ext: string,
    contentType: string
  ): Promise<string | null>;
  finishMeeting(meetingId: string, fields: MeetingFinishFields): Promise<void>;
  getSignedRecordingUrl(meetingId: string): Promise<string | null>;
}

export type MeetingStartResult =
  | { kind: "created"; id: string }
  | { kind: "create-failed" };

export type MeetingFinishResult =
  | { kind: "invalid"; message: "缺少 meetingId" }
  | { kind: "ok"; recordingSaved: boolean };

export type MeetingTurnLogResult =
  | { kind: "invalid"; message: "缺少 meetingId 或 content" }
  | { kind: "ok" };

export type MeetingRecordingResult =
  | { kind: "invalid"; message: "缺少 id" }
  | { kind: "not-found"; message: "找不到錄音檔" }
  | { kind: "ok"; url: string };

export function parseMeetingStartRequest(payload: unknown): MeetingStartRequest {
  const body =
    typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  return { title: typeof body.title === "string" ? body.title : undefined };
}

export function parseMeetingFinishForm(form: MeetingFormLike): MeetingFinishRequest {
  const meetingId = String(form.get("meetingId") ?? "");
  const transcriptValue = form.get("transcript");
  const durationRaw = form.get("durationSeconds");
  const audioValue = form.get("audio");

  return {
    meetingId,
    transcript: transcriptValue ? String(transcriptValue) : undefined,
    durationSeconds: durationRaw ? Number(durationRaw) : undefined,
    audio:
      audioValue && typeof audioValue === "object" && "arrayBuffer" in audioValue
        ? (audioValue as MeetingFinishAudio)
        : undefined,
  };
}

export function parseMeetingTurnLogRequest(payload: unknown): MeetingTurnLogRequest {
  const body =
    typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  return {
    meetingId: typeof body.meetingId === "string" ? body.meetingId : "",
    role: body.role === "agent" || body.role === "teamlead" ? body.role : "boss",
    content: typeof body.content === "string" ? body.content.trim() : "",
    agentSlug: typeof body.agentSlug === "string" ? body.agentSlug : undefined,
    speaker: typeof body.speaker === "string" ? body.speaker : undefined,
  };
}

export function parseMeetingRecordingRequest(rawId: string | null): MeetingRecordingRequest {
  return { meetingId: rawId ?? "" };
}

export function recordingDescriptor(audio: MeetingFinishAudio): { ext: string; contentType: string } {
  const contentType = audio.type || "audio/webm";
  const ext = contentType.includes("mp4") ? "mp4" : contentType.includes("ogg") ? "ogg" : "webm";
  return { ext, contentType };
}

export async function startMeeting(
  input: MeetingStartRequest,
  repository: Pick<MeetingSessionRepository, "create">
): Promise<MeetingStartResult> {
  const id = await repository.create(input.title);
  return id ? { kind: "created", id } : { kind: "create-failed" };
}

export async function finishMeetingSession(
  input: MeetingFinishRequest,
  repository: Pick<MeetingSessionRepository, "uploadRecording" | "finishMeeting">
): Promise<MeetingFinishResult> {
  if (!input.meetingId) return { kind: "invalid", message: "缺少 meetingId" };

  let recordingPath: string | null = null;
  if (input.audio) {
    const { ext, contentType } = recordingDescriptor(input.audio);
    try {
      const bytes = await input.audio.arrayBuffer();
      recordingPath = await repository.uploadRecording(input.meetingId, bytes, ext, contentType);
    } catch {
      recordingPath = null;
    }
  }

  await repository.finishMeeting(input.meetingId, {
    transcript: input.transcript,
    durationSeconds: Number.isFinite(input.durationSeconds) ? input.durationSeconds : undefined,
    recordingPath,
  });

  return { kind: "ok", recordingSaved: Boolean(recordingPath) };
}

export async function logMeetingTurn(
  input: MeetingTurnLogRequest,
  repository: Pick<MeetingSessionRepository, "appendTurns">
): Promise<MeetingTurnLogResult> {
  if (!input.meetingId || !input.content) {
    return { kind: "invalid", message: "缺少 meetingId 或 content" };
  }

  try {
    await repository.appendTurns(input.meetingId, [
      {
        role: input.role,
        agentSlug: input.agentSlug,
        speaker: input.speaker,
        content: input.content,
      },
    ]);
  } catch {
    // Existing behavior: persistence failure must not interrupt a live meeting.
  }
  return { kind: "ok" };
}

export async function getMeetingRecording(
  input: MeetingRecordingRequest,
  repository: Pick<MeetingSessionRepository, "getSignedRecordingUrl">
): Promise<MeetingRecordingResult> {
  if (!input.meetingId) return { kind: "invalid", message: "缺少 id" };

  const url = await repository.getSignedRecordingUrl(input.meetingId);
  if (!url) return { kind: "not-found", message: "找不到錄音檔" };
  return { kind: "ok", url };
}
