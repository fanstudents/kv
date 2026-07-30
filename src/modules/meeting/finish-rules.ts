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

export interface MeetingFinishFormLike {
  get(name: string): unknown;
}

export function parseMeetingFinishForm(form: MeetingFinishFormLike): MeetingFinishRequest {
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

export function recordingDescriptor(audio: MeetingFinishAudio): { ext: string; contentType: string } {
  const contentType = audio.type || "audio/webm";
  const ext = contentType.includes("mp4") ? "mp4" : contentType.includes("ogg") ? "ogg" : "webm";
  return { ext, contentType };
}
