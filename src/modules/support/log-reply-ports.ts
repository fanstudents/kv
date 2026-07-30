export interface SupportLogReplyPort {
  logBotReply(userId: string, text: string): Promise<void>;
}
