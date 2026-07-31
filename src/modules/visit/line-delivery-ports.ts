export interface VisitLineDeliveryPort {
  replyText(replyToken: string, text: string): Promise<void>;
  replyMessages(replyToken: string, messages: unknown[]): Promise<void>;
  pushText(lineUserId: string, text: string): Promise<void>;
}
