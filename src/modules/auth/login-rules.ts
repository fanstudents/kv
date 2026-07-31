export interface LoginRequest {
  password: string;
}

export function parseLoginRequest(body: unknown): LoginRequest {
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  return { password: typeof input.password === "string" ? input.password : "" };
}
