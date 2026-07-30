import type { NormalizedOrder } from "@/modules/orders/domain";
import type { OrderNotificationPlan } from "@/modules/orders/notification";

export interface OrdersAgentConfig {
  enabled?: boolean | null;
  settings?: unknown;
}

export interface OrdersActivity {
  summary: string;
  status: "success" | "failed";
}

export interface OrdersRepositoryPort {
  upsertOrder(order: NormalizedOrder): Promise<void>;
  getAgentConfig(): Promise<OrdersAgentConfig | null>;
  recordActivity(activity: OrdersActivity): Promise<void>;
}

export interface OrdersDeliveryPort {
  deliver(notification: Extract<OrderNotificationPlan, { type: "deliver" }>): Promise<void>;
}

export interface OrdersPorts {
  repository: OrdersRepositoryPort;
  delivery: OrdersDeliveryPort;
}
