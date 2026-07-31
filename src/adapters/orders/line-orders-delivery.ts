import "server-only";

import { pushLineRawMessages } from "@/lib/line";
import { buildPushMessages } from "@/lib/line-message-styles";
import type { OrdersDelivery } from "@/modules/orders/orders";

export function createLineOrdersDelivery(): OrdersDelivery {
  return {
    async deliver(delivery) {
      await pushLineRawMessages(
        delivery.recipient,
        buildPushMessages({
          style: delivery.style,
          text: delivery.text,
          title: delivery.title,
          accentColor: delivery.accentColor,
        })
      );
    },
  };
}
