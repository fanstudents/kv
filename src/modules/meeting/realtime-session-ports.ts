export interface RealtimeSessionMintInput {
  agentName: string;
  role: string;
  description: string;
  voice: string;
  isTeamLead: boolean;
  history: string;
  liveContext: string;
}

export interface RealtimeSessionHistoryPort {
  load(meetingId: string, limit: number): Promise<string>;
}

export interface RealtimeSessionContextPort {
  demo(agentSlug: string): string;
  live(agentSlug: string): Promise<string>;
}

export interface RealtimeSessionProviderPort {
  mint(input: RealtimeSessionMintInput): Promise<unknown>;
}

export interface RealtimeSessionPorts {
  history: RealtimeSessionHistoryPort;
  context: RealtimeSessionContextPort;
  provider: RealtimeSessionProviderPort;
}
