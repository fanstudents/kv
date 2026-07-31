import { describe, expect, it } from "vitest";
import { runDraftInviteEmail, runParseBusinessCard } from "@/modules/visit/ai-application";
import type { VisitAiPort } from "@/modules/visit/ai-ports";

function fakePort(overrides?: Partial<VisitAiPort>) {
  const calls: string[] = [];
  const port: VisitAiPort = {
    async draftInviteEmail() {
      calls.push("draft");
      return { subject: "邀約", body: "內容" };
    },
    async parseBusinessCard() {
      calls.push("card");
      return { name: "Dennis", company: "TBR", title: "CEO", email: "d@example.test", phone: "" };
    },
    async recordActivity(activity) {
      calls.push(`activity:${activity.status}:${activity.summary}`);
    },
    ...overrides,
  };
  return { port, calls };
}

describe("Visit AI application", () => {
  it("keeps draft success and activity vocabulary", async () => {
    const { port, calls } = fakePort();
    await expect(runDraftInviteEmail({ contactName: "Dennis", contactTitle: "", company: "", meetingType: "喝咖啡", slot1: "A", slot2: "B", senderName: "" }, port)).resolves.toEqual({
      kind: "ok",
      data: { subject: "邀約", body: "內容" },
    });
    expect(calls).toEqual(["draft", "activity:success:已用 AI 產生邀約信草稿給 Dennis"]);
  });

  it("keeps draft provider failure mapping", async () => {
    const { port, calls } = fakePort({ draftInviteEmail: async () => { throw new Error("OpenAI unavailable"); } });
    await expect(runDraftInviteEmail({ contactName: "Dennis", contactTitle: "", company: "", meetingType: "喝咖啡", slot1: "A", slot2: "B", senderName: "" }, port)).resolves.toEqual({ kind: "error", message: "OpenAI unavailable" });
    expect(calls).toEqual(["activity:failed:AI 產生邀約信失敗：OpenAI unavailable"]);
  });

  it("keeps card success and empty-name activity wording", async () => {
    const { port, calls } = fakePort({ parseBusinessCard: async () => ({ name: "", company: "Acme", title: "", email: "", phone: "" }) });
    await expect(runParseBusinessCard("data:image/png;base64,abc", port)).resolves.toMatchObject({ kind: "ok", data: { company: "Acme" } });
    expect(calls).toEqual(["activity:success:已辨識名片：（未辨識出姓名） / Acme"]);
  });

  it("keeps card provider failure mapping", async () => {
    const { port, calls } = fakePort({ parseBusinessCard: async () => { throw new Error("Vision unavailable"); } });
    await expect(runParseBusinessCard("data:image/png;base64,abc", port)).resolves.toEqual({ kind: "error", message: "Vision unavailable" });
    expect(calls).toEqual(["activity:failed:名片辨識失敗：Vision unavailable"]);
  });
});
