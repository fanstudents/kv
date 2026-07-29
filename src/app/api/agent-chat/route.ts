import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { AGENTS } from "@/lib/agent-data";
import { getAgentLiveContext } from "@/lib/meeting-context";
import { replyToChat } from "@/lib/openai";
import { buildCanvasForReply } from "@/lib/chat-canvas";
import { tracked } from "@/lib/agent-runs";
import { remember } from "@/lib/agent-memory";
import type { AgentSlug } from "@/lib/types";

const TEAM_LEAD_SLUG = "teamlead";

// 網站聊天視窗：老闆 @ 一位 Agent 傳訊息，該 Agent 依真實業務資料用日常口語回覆。
//
// 整段包在 tracked() 裡：每一次對話都是一次可查的執行，AI 成本自動歸屬到它，
// 失敗時也會留下錯誤分類而不是只回一個 502 就消失。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const agentSlug = typeof body.agentSlug === "string" ? body.agentSlug : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const history = typeof body.history === "string" ? body.history : "";

  if (!agentSlug || !message) {
    return NextResponse.json({ error: "缺少 agentSlug 或 message" }, { status: 400 });
  }

  const agent = AGENTS.find((a) => a.slug === agentSlug);
  if (!agent) return NextResponse.json({ error: "找不到這位 Agent" }, { status: 404 });

  try {
    const { text, canvas } = await tracked(
      {
        agentSlug: agent.slug,
        trigger: "manual",
        meta: { surface: "chat", question: message.slice(0, 200) },
        summarize: (r) => `回覆老闆的提問：${r.text.slice(0, 80)}`,
      },
      async () => {
        let liveContext = "";
        try {
          // 把使用者這句話一起傳進去：知識庫與記憶那兩段會依問題檢索，而不是全量塞
          liveContext = await getAgentLiveContext(agentSlug, message);
        } catch (err) {
          // 真實資料抓不到就照實跟老闆說沒有，不阻塞聊天
          console.error("[agent-chat] 即時脈絡組裝失敗", { agentSlug, err });
        }

        const text = await replyToChat({
          agent: {
            slug: agent.slug,
            name: `${agent.personEn} ${agent.personZh}`,
            role: agent.role,
            description: agent.description,
          },
          message,
          liveContext,
          history,
          isTeamLead: agent.slug === TEAM_LEAD_SLUG,
        });

        let canvas = null;
        try {
          canvas = await buildCanvasForReply({
            agentSlug,
            message,
            replyText: text,
            agent: {
              slug: agent.slug,
              name: `${agent.personEn} ${agent.personZh}`,
              role: agent.role,
              description: agent.description,
            },
          });
        } catch (err) {
          // 畫布資料抓不到就不附畫布，不影響文字回覆
          console.error("[agent-chat] 畫布組裝失敗", { agentSlug, err });
        }

        return { text, canvas };
      }
    );

    // 沉澱記憶：回應已經可以先送出去了，記憶不必讓老闆等。
    // 只記「問了什麼、答了什麼」的梗概，30 天後過期——聊天的細節不值得永久保存，
    // 但「這件事上週問過」是下次回答時該知道的。
    after(async () => {
      await remember({
        content: `老闆問「${message.slice(0, 120)}」，我回覆：${(text || "").slice(0, 200)}`,
        agentSlug: agent.slug as AgentSlug,
        kind: "episodic",
        ttlDays: 30,
      });
    });

    return NextResponse.json({ reply: text || "收到，我確認後回覆您。", canvas });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "回覆失敗";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
