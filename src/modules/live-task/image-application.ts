import type { LiveTaskImagePort } from "./image-ports";
import { parseLiveTaskImageDataUrl, type LiveTaskImageRequest } from "./image-rules";

export type LiveTaskImageResult =
  | { kind: "not-found" }
  | { kind: "ok"; contentType: string; base64: string };

export async function runLiveTaskImage(
  input: LiveTaskImageRequest,
  port: LiveTaskImagePort,
): Promise<LiveTaskImageResult> {
  const descriptor = parseLiveTaskImageDataUrl(await port.getImage(input.agentSlug));
  if (!descriptor) return { kind: "not-found" };
  return { kind: "ok", ...descriptor };
}
