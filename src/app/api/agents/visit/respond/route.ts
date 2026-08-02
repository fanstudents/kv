import { after, NextRequest, NextResponse } from "next/server";
import { buildThankYouEmailHtml, escapeHtml } from "@/lib/email-templates";
import { createLegacyVisitRespondSources } from "@/adapters/visit/legacy-respond-sources";
import { createVisitResearchDependencies } from "@/adapters/visit/visit-research-dependencies";
import {
  fulfilVisitPublicInvite,
  resolveVisitPublicInviteGet,
  type VisitPublicInvitePage,
} from "@/modules/visit/respond";
import { runVisitContactResearch } from "@/modules/visit/research";

const research = createVisitResearchDependencies();

function page(title: string, message: string, tone: "success" | "error" = "success") {
  const accent = tone === "success" ? "#06C755" : "#EF4444";
  const html = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;">
  <div style="max-width:420px;width:90%;background:#ffffff;border-radius:12px;padding:32px 28px;text-align:center;">
    <div style="width:48px;height:48px;border-radius:50%;background:${accent};margin:0 auto 16px;"></div>
    <h1 style="font-size:18px;color:#27272a;margin:0 0 12px;">${escapeHtml(title)}</h1>
    <p style="font-size:14px;color:#52525b;line-height:1.7;margin:0;">${escapeHtml(message)}</p>
  </div>
</body>
</html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function locationFormPage(params: { inviteId: string; chosenLabel: string }) {
  const html = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>時段已記錄</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;">
  <div style="max-width:420px;width:90%;background:#ffffff;border-radius:12px;padding:32px 28px;">
    <div style="width:48px;height:48px;border-radius:50%;background:#06C755;margin:0 auto 16px;"></div>
    <h1 style="font-size:18px;color:#27272a;margin:0 0 8px;text-align:center;">時段已記錄 ☕</h1>
    <p style="font-size:14px;color:#52525b;line-height:1.7;margin:0 0 20px;text-align:center;">
      已為您安排 <strong>${escapeHtml(params.chosenLabel)}</strong>，方便的話留下想約的地點吧！
    </p>
    <form method="POST" action="/api/agents/visit/respond?invite=${encodeURIComponent(params.inviteId)}">
      <label style="display:block;font-size:13px;color:#71717a;margin-bottom:6px;">地點（選填）</label>
      <input
        type="text"
        name="location"
        maxlength="100"
        placeholder="例如：公司附近咖啡廳，或您喜歡的地方"
        style="width:100%;box-sizing:border-box;padding:12px 14px;border:1px solid #d4d4d8;border-radius:8px;font-size:14px;margin-bottom:16px;"
      />
      <button
        type="submit"
        style="width:100%;padding:14px;background:#06C755;color:#ffffff;border:none;border-radius:8px;font-size:15px;font-weight:bold;cursor:pointer;"
      >
        確認送出
      </button>
    </form>
    <p style="font-size:12px;color:#a1a1aa;margin:16px 0 0;text-align:center;">沒有特別偏好的話，留白直接送出也沒問題</p>
  </div>
</body>
</html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function renderPublicInvitePage(result: VisitPublicInvitePage) {
  if (result.kind === "location-form") {
    return locationFormPage(result);
  }
  return page(result.title, result.message, result.tone);
}

export async function GET(req: NextRequest) {
  const { read } = createLegacyVisitRespondSources();
  const result = await resolveVisitPublicInviteGet({
    inviteId: req.nextUrl.searchParams.get("invite"),
    choiceValue: req.nextUrl.searchParams.get("choice"),
    read,
    nowIso: () => new Date().toISOString(),
  });
  return renderPublicInvitePage(result);
}

export async function POST(req: NextRequest) {
  const inviteId = req.nextUrl.searchParams.get("invite");
  const { read: readPort, fulfilment: fulfilmentPort } = createLegacyVisitRespondSources();
  const formData = inviteId ? await req.formData().catch(() => null) : null;
  const result = await fulfilVisitPublicInvite({
    inviteId,
    locationValue: formData?.get("location") ?? null,
    read: readPort,
    fulfilment: fulfilmentPort,
    renderThankYouEmail: buildThankYouEmailHtml,
    scheduleBackgroundResearch: ({ input, lineUserId, notificationText }) => {
      after(async () => {
        const profileId = await runVisitContactResearch(input, research);
        if (profileId) {
          await fulfilmentPort.pushLineMessage(lineUserId, notificationText).catch(() => {});
        }
      });
    },
  });

  return renderPublicInvitePage(result.page);
}
