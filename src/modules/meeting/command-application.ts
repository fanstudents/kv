import {
  displayName,
  TEAM_LEAD_SLUG,
  toMeetingAgentInput,
  withMeetingReplyFallback,
  type MeetingCatalogAgent,
  type MeetingCommandRequest,
} from "./command-rules";
import type {
  MeetingCommandPorts,
  MeetingCommandRoundResult,
} from "./command-ports";

export interface MeetingCommandRoster {
  teamLead: MeetingCatalogAgent | null;
  responders: MeetingCatalogAgent[];
  target: MeetingCatalogAgent | null;
}

export type MeetingCommandResult =
  | { kind: "teamlead-not-found" }
  | { kind: "target-not-found" }
  | { kind: "reply-failed"; message: string }
  | { kind: "one-to-one"; reply: { slug: string; name: string; text: string } }
  | {
      kind: "round";
      replies: { slug: string; name: string; text: string }[];
      teamlead: { slug: string; name: string; text: string };
    };

export async function runMeetingCommand(
  input: MeetingCommandRequest,
  roster: MeetingCommandRoster,
  ports: MeetingCommandPorts
): Promise<MeetingCommandResult> {
  if (!roster.teamLead) return { kind: "teamlead-not-found" };
  if (input.targetSlug && !roster.target) return { kind: "target-not-found" };

  let history = "";
  try {
    history = await ports.history.load(input.meetingId);
  } catch {
    // Existing behavior: history failure must not block the current reply.
  }

  if (input.targetSlug && roster.target) {
    let text: string;
    try {
      text = await ports.replies.oneToOne({
        agent: toMeetingAgentInput(roster.target),
        command: input.command,
        history,
        isTeamLead: roster.target.slug === TEAM_LEAD_SLUG,
      });
    } catch (error) {
      return {
        kind: "reply-failed",
        message: error instanceof Error ? error.message : "會議回應失敗",
      };
    }

    const name = displayName(roster.target);
    const reply = { slug: roster.target.slug, name, text: withMeetingReplyFallback(text) };
    try {
      await ports.turns.append(input.meetingId, [
        { role: "boss", speaker: "老闆", content: input.command },
        {
          role: roster.target.slug === TEAM_LEAD_SLUG ? "teamlead" : "agent",
          agentSlug: roster.target.slug,
          speaker: name,
          content: reply.text,
        },
      ]);
    } catch {
      // Existing behavior: persistence failure must not block the current reply.
    }
    return { kind: "one-to-one", reply };
  }

  let result: MeetingCommandRoundResult;
  try {
    result = await ports.replies.round({
      command: input.command,
      teamLead: toMeetingAgentInput(roster.teamLead),
      agents: roster.responders.map(toMeetingAgentInput),
      history,
    });
  } catch (error) {
    return {
      kind: "reply-failed",
      message: error instanceof Error ? error.message : "會議回應失敗",
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

  try {
    await ports.turns.append(input.meetingId, [
      { role: "boss", speaker: "老闆", content: input.command },
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
  } catch {
    // Existing behavior: persistence failure must not block the current reply.
  }

  return { kind: "round", replies, teamlead };
}
