export interface MeetingTranscribeAudio {
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface MeetingTranscribeRequest {
  audio?: MeetingTranscribeAudio;
  promptHint?: string;
}

export interface MeetingTranscribeFormLike {
  get(name: string): unknown;
}

export function parseMeetingTranscribeForm(form: MeetingTranscribeFormLike): MeetingTranscribeRequest {
  const audio = form.get("audio");
  const promptHintValue = form.get("promptHint");
  return {
    audio:
      audio && typeof audio === "object" && "arrayBuffer" in audio
        ? (audio as MeetingTranscribeAudio)
        : undefined,
    promptHint: promptHintValue ? String(promptHintValue) : undefined,
  };
}
