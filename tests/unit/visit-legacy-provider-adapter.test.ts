import { beforeEach, describe, expect, it, vi } from "vitest";

const { createChatCompletion } = vi.hoisted(() => ({ createChatCompletion: vi.fn() }));

vi.mock("@/adapters/openai/client", () => ({ createChatCompletion }));
vi.mock("@/lib/google", () => ({
  createCalendarEvent: vi.fn(),
  findFreeSlots: vi.fn(),
  sendGmail: vi.fn(),
}));

import { legacyVisitProviders } from "@/adapters/visit/legacy-provider-adapter";

beforeEach(() => vi.clearAllMocks());

describe("Visit legacy provider adapter", () => {
  it("keeps Visit prompts and structured provider mappings in the domain adapter", async () => {
    createChatCompletion
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                name: "Dennis",
                company: "TBR",
                title: "Founder",
                email: "dennis@example.com",
                phone: "0900000000",
              }),
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: '{"type":"correction","field":"title","value":"  CEO  "}' } }],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: '{"subject":"邀約","body":"一起聊聊"}' } }],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: '{"subject":"新版邀約","body":"正式一點"}' } }],
      });

    await expect(legacyVisitProviders.parseBusinessCard("data:image/png;base64,x")).resolves.toEqual({
      name: "Dennis",
      company: "TBR",
      title: "Founder",
      email: "dennis@example.com",
      phone: "0900000000",
    });
    await expect(
      legacyVisitProviders.interpretCardReply({
        currentCard: { name: "Dennis", company: "TBR", title: "Founder", email: "", phone: "" },
        userText: "職稱改成 CEO",
      })
    ).resolves.toEqual({ type: "correction", field: "title", value: "CEO" });
    await expect(
      legacyVisitProviders.draftInviteEmail({
        contactName: "Dennis",
        meetingType: "coffee",
        slot1: "one",
        slot2: "two",
        senderName: "CabLate",
      })
    ).resolves.toEqual({ subject: "邀約", body: "一起聊聊" });
    await expect(
      legacyVisitProviders.reviseInviteEmail({
        contactName: "Dennis",
        meetingType: "coffee",
        senderName: "CabLate",
        previousSubject: "邀約",
        previousBody: "一起聊聊",
        instruction: "正式一點",
      })
    ).resolves.toEqual({ subject: "新版邀約", body: "正式一點" });
    expect(createChatCompletion).toHaveBeenCalledTimes(4);
    expect(createChatCompletion).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ model: "gpt-4o", temperature: 0 }),
      { operation: "名片辨識", agentSlug: "visit" }
    );
  });

  it("maps malformed structured output to the established safe Visit fallbacks", async () => {
    createChatCompletion.mockResolvedValue({ choices: [{ message: { content: "not-json" } }] });

    await expect(legacyVisitProviders.parseBusinessCard("image")).resolves.toEqual({
      name: "",
      company: "",
      title: "",
      email: "",
      phone: "",
    });
    await expect(
      legacyVisitProviders.interpretCardReply({
        currentCard: { name: "", company: "", title: "", email: "", phone: "" },
        userText: "?",
      })
    ).resolves.toEqual({ type: "other" });
  });
});
