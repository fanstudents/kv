export type SubscriberChannel = "primary" | "support";

export interface SubscriberTouchPort {
  touch(lineUserId: string, channel: SubscriberChannel): Promise<void>;
}
