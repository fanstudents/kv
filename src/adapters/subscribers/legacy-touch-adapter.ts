import "server-only";

import { touchSubscriber } from "@/lib/subscribers";
import type { SubscriberChannel, SubscriberTouchPort } from "@/modules/subscribers/touch-ports";

export function createLegacySubscriberTouchAdapter(): SubscriberTouchPort {
  return {
    touch(lineUserId: string, channel: SubscriberChannel) {
      return touchSubscriber(lineUserId, channel);
    },
  };
}
