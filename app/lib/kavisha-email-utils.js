const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://kavisha.ai";

export function getKavishaFooterHtml(unsubscribeToken) {
  const linkStyle =
    "display:inline-block;padding:8px 10px;margin:4px;background:#004A4E;color:#fff;text-decoration:none;border-radius:6px;font-size:10px;font-weight:200;";
  const unsubUrl = `${BASE_URL}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
  return `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;padding-top:24px;border-top:1px solid #e5e7eb;">
  <tr><td align="center" style="padding:16px 0 8px;font-size:12px;color:#6b7280;">This mail is powered by <a href="${BASE_URL}" style="color:#004A4E;text-decoration:none;">kavisha.ai</a></td></tr>
  <tr><td align="center" style="padding:8px 0 24px;">
    <a href="${unsubUrl}" style="${linkStyle}">Unsubscribe</a>
    <a href="${BASE_URL}/talk-to-avatar" style="${linkStyle}">Talk to Avataar</a>
    <a href="${BASE_URL}/make-avatar" style="${linkStyle}">Make your Avataar</a>
    <a href="${BASE_URL}/community" style="${linkStyle}">Community</a>
  </td></tr>
</table>`;
}

export function wrapCentered(html) {
  return `
<table width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
  <tr><td align="center" style="padding:20px;">
    <table width="600" cellpadding="0" cellspacing="0" align="center" style="max-width:100%;">
      <tr><td>${html}</td></tr>
    </table>
  </td></tr>
</table>`;
}
