import "server-only";

import { pushLineRawMessages } from "@/lib/line";
import { buildPushMessages } from "@/lib/line-message-styles";

export function createLineDailyReportDelivery() {
  return {
    async deliver(notification: {
      recipient: string;
      style: "text" | "flex" | "confirm" | "buttons";
      text: string;
      title: string;
      accentColor: string;
    }): Promise<void> {
      await pushLineRawMessages(
        notification.recipient,
        buildPushMessages({
          style: notification.style,
          text: notification.text,
          title: notification.title,
          accentColor: notification.accentColor,
        })
      );
    },
  };
}
