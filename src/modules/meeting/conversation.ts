import type { MeetingSessionRepository, MeetingStoredTurn } from "./session";

export interface MeetingCommandRequest {
  meetingId: string;
  command: string;
  targetSlug: string;
}

export interface MeetingAgentInput {
  slug: string;
  name: string;
  role: string;
  description: string;
}

export interface MeetingCatalogAgent extends MeetingAgentInput {
  personEn: string;
  personZh: string;
  status: string;
}

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

export interface MeetingConversationProvider {
  oneToOne(input: MeetingCommandReplyInput): Promise<string>;
  round(input: MeetingCommandRoundInput): Promise<MeetingCommandRoundResult>;
}

export interface MeetingConversationRoster {
  teamLead: MeetingCatalogAgent | null;
  responders: MeetingCatalogAgent[];
  target: MeetingCatalogAgent | null;
}

export const TEAM_LEAD_SLUG = "teamlead";

export type MeetingConversationResult =
  | { kind: "teamlead-not-found" }
  | { kind: "target-not-found" }
  | { kind: "reply-failed"; message: string }
  | { kind: "one-to-one"; reply: { slug: string; name: string; text: string } }
  | {
      kind: "round";
      replies: { slug: string; name: string; text: string }[];
      teamlead: { slug: string; name: string; text: string };
    };

export function parseMeetingCommandRequest(payload: unknown): MeetingCommandRequest | null {
  const body =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : {};
  const meetingId = typeof body.meetingId === "string" ? body.meetingId : "";
  const command = typeof body.command === "string" ? body.command.trim() : "";
  const targetSlug = typeof body.targetSlug === "string" ? body.targetSlug : "";

  if (!meetingId || !command) return null;
  return { meetingId, command, targetSlug };
}

export function toMeetingAgentInput(agent: MeetingCatalogAgent): MeetingAgentInput {
  return {
    slug: agent.slug,
    name: displayName(agent),
    role: agent.role,
    description: agent.description,
  };
}

export function displayName(agent: Pick<MeetingCatalogAgent, "personEn" | "personZh">): string {
  return `${agent.personEn} ${agent.personZh}`;
}

export function selectMeetingRoster(agents: readonly MeetingCatalogAgent[]) {
  return {
    teamLead: agents.find((agent) => agent.slug === TEAM_LEAD_SLUG) ?? null,
    responders: agents.filter(
      (agent) => agent.status === "active" && agent.slug !== TEAM_LEAD_SLUG
    ),
  };
}

export function findActiveMeetingAgent(
  agents: readonly MeetingCatalogAgent[],
  slug: string
): MeetingCatalogAgent | null {
  return agents.find((agent) => agent.slug === slug && agent.status === "active") ?? null;
}

export function withMeetingReplyFallback(text: string): string {
  return text || "\u6536\u5230\uff0c\u6211\u99ac\u4e0a\u8655\u7406\uff0c\u7a0d\u5f8c\u56de\u5831\u9032\u5ea6\u7d66\u60a8\u3002";
}

export async function runMeetingConversation(
  input: MeetingCommandRequest,
  roster: MeetingConversationRoster,
  session: Pick<MeetingSessionRepository, "getHistory" | "appendTurns">,
  provider: MeetingConversationProvider
): Promise<MeetingConversationResult> {
  if (!roster.teamLead) return { kind: "teamlead-not-found" };
  if (input.targetSlug && !roster.target) return { kind: "target-not-found" };

  let history = "";
  try {
    history = await session.getHistory(input.meetingId);
  } catch {
    // Existing behavior: history failure must not block the current reply.
  }

  if (input.targetSlug && roster.target) {
    let text: string;
    try {
      text = await provider.oneToOne({
        agent: toMeetingAgentInput(roster.target),
        command: input.command,
        history,
        isTeamLead: roster.target.slug === TEAM_LEAD_SLUG,
      });
    } catch (error) {
      return {
        kind: "reply-failed",
        message: error instanceof Error ? error.message : "\u6703\u8b70\u56de\u61c9\u5931\u6557",
      };
    }

    const name = displayName(roster.target);
    const reply = { slug: roster.target.slug, name, text: withMeetingReplyFallback(text) };
    await appendConversationTurns(session, input.meetingId, [
      { role: "boss", speaker: "\u8001\u95c6", content: input.command },
      {
        role: roster.target.slug === TEAM_LEAD_SLUG ? "teamlead" : "agent",
        agentSlug: roster.target.slug,
        speaker: name,
        content: reply.text,
      },
    ]);
    return { kind: "one-to-one", reply };
  }

  let result: MeetingCommandRoundResult;
  try {
    result = await provider.round({
      command: input.command,
      teamLead: toMeetingAgentInput(roster.teamLead),
      agents: roster.responders.map(toMeetingAgentInput),
      history,
    });
  } catch (error) {
    return {
      kind: "reply-failed",
      message: error instanceof Error ? error.message : "\u6703\u8b70\u56de\u61c9\u5931\u6557",
    };
  }

  const nameBySlug = new Map<string, string>([
    [roster.teamLead.slug, displayName(roster.teamLead)],
    ...roster.responders.map((agent) => [agent.slug, displayName(agent)] as const),
  ]);
  const replies = result.replies.map((reply) => ({
    slug: reply.slug,
    name: nameBySlug.get(reply.slug) ?? reply.slug,
    text: reply.text,
  }));
  const teamlead = {
    slug: TEAM_LEAD_SLUG,
    name: displayName(roster.teamLead),
    text: result.teamlead,
  };

  await appendConversationTurns(session, input.meetingId, [
    { role: "boss", speaker: "\u8001\u95c6", content: input.command },
    ...replies.map((reply) => ({
      role: "agent" as const,
      agentSlug: reply.slug,
      speaker: reply.name,
      content: reply.text,
    })),
    {
      role: "teamlead" as const,
      agentSlug: TEAM_LEAD_SLUG,
      speaker: teamlead.name,
      content: teamlead.text,
    },
  ]);

  return { kind: "round", replies, teamlead };
}

async function appendConversationTurns(
  session: Pick<MeetingSessionRepository, "appendTurns">,
  meetingId: string,
  turns: MeetingStoredTurn[]
): Promise<void> {
  try {
    await session.appendTurns(meetingId, turns);
  } catch {
    // Existing behavior: persistence failure must not block the current reply.
  }
}
