import type { MeetingAgentInput } from "./command-rules";

export interface MeetingCommandReplyInput {
  agent: MeetingAgentInput;
  command: string;
  history: string;
  isTeamLead: boolean;
}

export interface MeetingCommandRoundInput {
  command: string;
  teamLead: MeetingAgentInput;
  agents: MeetingAgentInput[];
  history: string;
}

export interface MeetingCommandReply {
  slug: string;
  text: string;
}

export interface MeetingCommandRoundResult {
  replies: MeetingCommandReply[];
  teamlead: string;
}

export interface MeetingCommandTurn {
  role: "boss" | "agent" | "teamlead";
  agentSlug?: string;
  speaker?: string;
  content: string;
}

export interface MeetingCommandHistoryPort {
  load(meetingId: string, limit?: number): Promise<string>;
}

export interface MeetingCommandReplyPort {
  oneToOne(input: MeetingCommandReplyInput): Promise<string>;
  round(input: MeetingCommandRoundInput): Promise<MeetingCommandRoundResult>;
}

export interface MeetingCommandTurnPort {
  append(meetingId: string, turns: MeetingCommandTurn[]): Promise<void>;
}

export interface MeetingCommandPorts {
  history: MeetingCommandHistoryPort;
  replies: MeetingCommandReplyPort;
  turns: MeetingCommandTurnPort;
}
