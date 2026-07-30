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
