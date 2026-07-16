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

function ctaButton(params: { label: string; href: string; primary: boolean; accentColor: string }): string {
  const { label, href, primary, accentColor } = params;
  const bg = primary ? accentColor : "#ffffff";
  const color = primary ? "#ffffff" : accentColor;
  const border = primary ? "none" : `2px solid ${accentColor}`;
  return `
  <tr>
    <td align="center" style="padding:6px 0;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td align="center" style="border-radius:8px;background:${bg};border:${border};">
            <a href="${href}" target="_blank" style="display:inline-block;padding:14px 28px;min-width:180px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:${color};text-decoration:none;font-weight:bold;border-radius:6px;">
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
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f4f5;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellspacing="0" cellpadding="0" border="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:${accentColor};padding:20px 28px;">
              <p style="margin:0;color:#ffffff;font-size:16px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;">邀約時間確認</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;color:#27272a;font-size:15px;line-height:1.7;">
              ${textToParagraphs(params.introText)}
              <p style="margin:24px 0 12px;font-weight:bold;color:#27272a;">請選擇您方便的時段：</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                ${ctaButton({ label: params.slot1Label, href: params.respondUrl1, primary: true, accentColor })}
                ${ctaButton({ label: params.slot2Label, href: params.respondUrl2, primary: true, accentColor })}
                ${ctaButton({ label: "兩個時段都可以", href: params.respondUrlBoth, primary: false, accentColor })}
              </table>
              <p style="margin:20px 0 0;font-size:13px;color:#71717a;">點選「兩個時段都可以」將直接為您安排第一個時段。</p>
              <p style="margin:24px 0 0;">${escapeHtml(params.senderName)} 敬上</p>
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
  accentColor?: string;
}): string {
  const accentColor = params.accentColor ?? "#06C755";
  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f4f5;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellspacing="0" cellpadding="0" border="0" style="max-width:480px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:${accentColor};padding:20px 28px;">
              <p style="margin:0;color:#ffffff;font-size:16px;font-weight:bold;">時段已確認 ✅</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;color:#27272a;font-size:15px;line-height:1.7;">
              <p style="margin:0 0 16px;">${escapeHtml(params.contactName)} 您好，</p>
              <p style="margin:0 0 16px;">謝謝您撥冗確認時間！我們約在 <strong>${escapeHtml(
                params.chosenLabel
              )}</strong> 見面，行事曆邀請已經寄到您的信箱，屆時見！</p>
              <p style="margin:24px 0 0;">${escapeHtml(params.senderName)} 敬上</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
