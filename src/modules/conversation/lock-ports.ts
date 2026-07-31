export interface ConversationLockOptions {
  ttlMinutes?: number;
  context?: Record<string, unknown>;
}

export type ConversationLockAcquisition = { ok: true } | { ok: false; heldBy: string };

export interface ConversationLockPort {
  acquire(
    lineUserId: string,
    agentSlug: string,
    options?: ConversationLockOptions
  ): Promise<ConversationLockAcquisition>;
  release(lineUserId: string, agentSlug: string): Promise<void>;
}
