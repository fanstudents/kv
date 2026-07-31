import type { VisitAiCardResult, VisitAiEmailResult, VisitAiPort } from "./ai-ports";
import type { DraftInviteEmailInput } from "./ai-rules";

export async function runDraftInviteEmail(input: DraftInviteEmailInput, port: VisitAiPort): Promise<VisitAiEmailResult> {
  try {
    const draft = await port.draftInviteEmail(input);
    await port.recordActivity({
      summary: `已用 AI 產生邀約信草稿給 ${input.contactName}`,
      status: "success",
    });
    return { kind: "ok", data: draft };
  } catch (error) {
    const message = error instanceof Error ? error.message : "邀約信生成失敗";
    await port.recordActivity({
      summary: `AI 產生邀約信失敗：${message}`,
      status: "failed",
    });
    return { kind: "error", message };
  }
}

export async function runParseBusinessCard(imageDataUrl: string, port: VisitAiPort): Promise<VisitAiCardResult> {
  try {
    const contact = await port.parseBusinessCard(imageDataUrl);
    await port.recordActivity({
      summary: `已辨識名片：${contact.name || "（未辨識出姓名）"}${contact.company ? ` / ${contact.company}` : ""}`,
      status: "success",
    });
    return { kind: "ok", data: contact };
  } catch (error) {
    const message = error instanceof Error ? error.message : "名片辨識失敗";
    await port.recordActivity({
      summary: `名片辨識失敗：${message}`,
      status: "failed",
    });
    return { kind: "error", message };
  }
}
