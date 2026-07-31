export interface LoginPort {
  isConfigured(): boolean;
  verifyPassword(password: string): boolean;
  createSessionToken(): string;
}
