export interface SupportRelayForwardRequest {
  rawBody: string;
  signature: string;
  contentType: string;
}

export interface SupportRelayActivity {
  summary: string;
  status: "success" | "failed";
}

export interface SupportRelayForwardPort {
  forward(request: SupportRelayForwardRequest): Promise<void>;
}

export interface SupportRelayRepositoryPort {
  recordActivity(activity: SupportRelayActivity): Promise<void>;
}

export interface SupportRelaySubscriberPort {
  touch(lineUserId: string): Promise<void>;
}

export interface SupportRelayConversationPort {
  recordCustomerMessage(lineUserId: string, text: string): Promise<void>;
}

export interface SupportRelayPorts {
  relay: SupportRelayForwardPort;
  repository: SupportRelayRepositoryPort;
  subscribers: SupportRelaySubscriberPort;
  conversations: SupportRelayConversationPort;
}
