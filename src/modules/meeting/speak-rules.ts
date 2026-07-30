export const DEFAULT_SPEAK_INSTRUCTIONS =
  "語速明顯偏快（比正常快三成）、不拖尾音、句與句之間不停頓太久。像幹練的專業同事在會議上簡潔回報，語氣自然有精神，說台灣腔繁體中文。";
export const DEFAULT_SPEAK_SPEED = 1.2;

export interface MeetingSpeakRequest {
  text: string;
  voice: string;
  instructions: string;
  speed: number;
}

export function parseMeetingSpeakRequest(payload: unknown): MeetingSpeakRequest {
  const body =
    typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  return {
    text: typeof body.text === "string" ? body.text.trim() : "",
    voice: typeof body.voice === "string" ? body.voice : "alloy",
    instructions:
      typeof body.instructions === "string" ? body.instructions : DEFAULT_SPEAK_INSTRUCTIONS,
    speed: typeof body.speed === "number" ? body.speed : DEFAULT_SPEAK_SPEED,
  };
}
