import "server-only";
import { AGENTS } from "@/lib/agent-data";
import { buildCanvasForReply } from "@/lib/chat-canvas";
import { getAgentLiveContext } from "@/lib/meeting-context";
import { replyToChat } from "@/lib/openai";
import type { AgentChatPorts } from "@/modules/agent-chat/chat";

const TEAM_LEAD_SLUG = "teamlead";

export function createAgentChatComposition(): AgentChatPorts {
  return {
    agents: {
      find(slug) {
        const agent = AGENTS.find((candidate) => candidate.slug === slug);
        if (!agent) return null;
        return {
          slug: agent.slug,
          name: `${agent.personEn} ${agent.personZh}`,
          role: agent.role,
          description: agent.description,
          isTeamLead: agent.slug === TEAM_LEAD_SLUG,
        };
      },
    },
    context: {
      load(agentSlug, question) {
        return getAgentLiveContext(agentSlug, question);
      },
    },
    replies: {
      generate(input) {
        return replyToChat({
          agent: {
            slug: input.agent.slug,
            name: input.agent.name,
            role: input.agent.role,
            description: input.agent.description,
          },
          message: input.message,
          liveContext: input.liveContext,
          history: input.history,
          isTeamLead: input.agent.isTeamLead,
        });
      },
    },
    canvas: {
      build(input) {
        return buildCanvasForReply({
          agentSlug: input.agent.slug,
          message: input.message,
          replyText: input.replyText,
          agent: {
            slug: input.agent.slug,
            name: input.agent.name,
            role: input.agent.role,
            description: input.agent.description,
          },
        });
      },
    },
  };
}
