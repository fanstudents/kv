export interface AgentChatAgent {
  slug: string;
  name: string;
  role: string;
  description: string;
  isTeamLead: boolean;
}

export interface AgentChatReplyInput {
  agent: AgentChatAgent;
  message: string;
  liveContext: string;
  history: string;
}

export interface AgentChatCanvasInput {
  agent: AgentChatAgent;
  message: string;
  replyText: string;
}

export interface AgentChatAgentDirectoryPort {
  find(slug: string): AgentChatAgent | null;
}

export interface AgentChatContextPort {
  load(agentSlug: string, question: string): Promise<string>;
}

export interface AgentChatReplyPort {
  generate(input: AgentChatReplyInput): Promise<string>;
}

export interface AgentChatCanvasPort {
  build(input: AgentChatCanvasInput): Promise<unknown | null>;
}

export interface AgentChatPorts {
  agents: AgentChatAgentDirectoryPort;
  context: AgentChatContextPort;
  replies: AgentChatReplyPort;
  canvas: AgentChatCanvasPort;
}
