import type { OrdersActivity, OrdersAgentConfig } from "./ports";
import type { OrderTestNotificationDelivery } from "./test-notification-rules";

export interface OrdersTestNotificationPort {
  getAgentConfig(): Promise<OrdersAgentConfig | null>;
  send(delivery: OrderTestNotificationDelivery): Promise<void>;
  recordActivity(activity: OrdersActivity): Promise<void>;
}
