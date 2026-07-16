export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToParagraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 16px;">${escapeHtml(block).replace(/\n/g, "<br />")}</p>`)
    .join("\n");
}

function iconBadge(params: { icon: string; accentColor: string }): string {
  return `
  <tr>
    <td align="center" style="padding-bottom:14px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td width="56" height="56" align="center" valign="middle" style="width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.4);font-size:26px;line-height:56px;">${params.icon}</td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function ctaButton(params: { label: string; href: string; primary: boolean; accentColor: string }): string {
  const { label, href, primary, accentColor } = params;
  const bg = primary ? accentColor : "#ffffff";
  const color = primary ? "#ffffff" : accentColor;
  const border = primary ? "none" : `2px solid ${accentColor}`;
  return `
  <tr>
    <td align="center" style="padding:7px 0;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td align="center" style="border-radius:10px;background:${bg};border:${border};box-shadow:0 2px 6px rgba(0,0,0,0.08);">
            <a href="${href}" target="_blank" style="display:inline-block;padding:15px 30px;min-width:190px;font-family:'Helvetica Neue',Arial,sans-serif;font-size:15px;color:${color};text-decoration:none;font-weight:bold;border-radius:10px;letter-spacing:0.2px;">
              ${escapeHtml(label)}
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

export function buildInviteEmailHtml(params: {
  introText: string;
  senderName: string;
  slot1Label: string;
  slot2Label: string;
  respondUrl1: string;
  respondUrl2: string;
  respondUrlBoth: string;
  accentColor?: string;
}): string {
  const accentColor = params.accentColor ?? "#06C755";
  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>邀約時間確認</title>
</head>
<body style="margin:0;padding:0;background:#eef1f0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#eef1f0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellspacing="0" cellpadding="0" border="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.06);">
          <tr>
            <td align="center" style="background:${accentColor};padding:36px 28px 30px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                ${iconBadge({ icon: "☕", accentColor })}
                <tr>
                  <td align="center">
                    <p style="margin:0;color:#ffffff;font-size:19px;font-weight:bold;letter-spacing:0.3px;">邀約時間確認</p>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin:6px 0 0;color:rgba(255,255,255,0.88);font-size:13px;">誠摯邀請您撥冗一敘</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 30px 28px;color:#27272a;font-size:15px;line-height:1.75;">
              ${textToParagraphs(params.introText)}

              <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0;" />

              <p style="margin:0 0 14px;font-weight:bold;color:#27272a;font-size:15px;">請選擇您方便的時段：</p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f7f8f7;border-radius:14px;padding:18px 0;">
                ${ctaButton({ label: `☕ ${params.slot1Label}`, href: params.respondUrl1, primary: true, accentColor })}
                ${ctaButton({ label: `☕ ${params.slot2Label}`, href: params.respondUrl2, primary: true, accentColor })}
                ${ctaButton({ label: "兩個時段都可以", href: params.respondUrlBoth, primary: false, accentColor })}
              </table>

              <p style="margin:16px 0 0;font-size:12.5px;color:#a1a1aa;text-align:center;">點選「兩個時段都可以」將直接為您安排第一個時段</p>
              <p style="margin:8px 0 0;font-size:12.5px;color:#a1a1aa;text-align:center;">選好時段後，會再請您留下方便的地點——若您心中已經有喜歡的口袋名單，直接告訴我們就可以！</p>

              <hr style="border:none;border-top:1px solid #e4e4e7;margin:28px 0 20px;" />

              <p style="margin:0;color:#27272a;">期待與您相見 ☕</p>
              <p style="margin:6px 0 0;font-weight:bold;color:#27272a;">${escapeHtml(params.senderName)} 敬上</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildThankYouEmailHtml(params: {
  contactName: string;
  senderName: string;
  chosenLabel: string;
  location?: string;
  accentColor?: string;
}): string {
  const accentColor = params.accentColor ?? "#06C755";
  const locationLine = params.location
    ? `我們約在 <strong>${escapeHtml(params.chosenLabel)}</strong>，地點就約在 <strong>${escapeHtml(
        params.location
      )}</strong>，行事曆邀請已經寄到您的信箱，屆時見 ☕`
    : `我們約在 <strong>${escapeHtml(
        params.chosenLabel
      )}</strong> 見面，地點的部分我們再另外跟您確認，行事曆邀請已經寄到您的信箱，屆時見 ☕`;
  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>時段已確認</title>
</head>
<body style="margin:0;padding:0;background:#eef1f0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#eef1f0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellspacing="0" cellpadding="0" border="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.06);">
          <tr>
            <td align="center" style="background:${accentColor};padding:32px 28px;">
              ${iconBadge({ icon: "✅", accentColor })}
              <p style="margin:0;color:#ffffff;font-size:18px;font-weight:bold;">時段已確認</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 30px;color:#27272a;font-size:15px;line-height:1.75;">
              <p style="margin:0 0 16px;">${escapeHtml(params.contactName)} 您好，</p>
              <p style="margin:0 0 16px;">謝謝您撥冗確認時間！${locationLine}</p>
              <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0 20px;" />
              <p style="margin:0;font-weight:bold;color:#27272a;">${escapeHtml(params.senderName)} 敬上</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
