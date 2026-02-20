import { NextResponse } from "next/server";
import { Resend } from "resend";
import { withAuth } from "@/app/lib/firebase/auth-middleware";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://kavisha.ai";

function getKavishaFooterHtml() {
  const linkStyle =
    "display:inline-block;padding:8px 10px;margin:4px;background:#004A4E;color:#fff;text-decoration:none;border-radius:6px;font-size:10px;font-weight:200;";
  return `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;padding-top:24px;border-top:1px solid #e5e7eb;">
  <tr><td align="center" style="padding:16px 0 8px;font-size:12px;color:#6b7280;">This mail is powered by <a href="${BASE_URL}" style="color:#004A4E;text-decoration:none;">kavisha.ai</a></td></tr>
  <tr><td align="center" style="padding:8px 0 24px;">
    <a href="${BASE_URL}/talk-to-avatar" style="${linkStyle}">Talk to avatar</a>
    <a href="${BASE_URL}/make-avatar" style="${linkStyle}">Make your avatar</a>
    <a href="${BASE_URL}/community" style="${linkStyle}">Community</a>
  </td></tr>
</table>`;
}

function wrapCentered(html) {
  return `
<table width="100%" cellpadding="0" cellspacing="0" style="width:100%;">
  <tr><td align="center" style="padding:20px;">
    <table width="600" cellpadding="0" cellspacing="0" align="center" style="max-width:100%;">
      <tr><td align="center" style="text-align:center;">${html}</td></tr>
    </table>
  </td></tr>
</table>`;
}

export async function POST(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const { recipients, subject, body, brand } = await req.json();

        if (
          !recipients ||
          !Array.isArray(recipients) ||
          recipients.length === 0
        ) {
          return NextResponse.json(
            { success: false, error: "No recipients provided" },
            { status: 400 }
          );
        }

        if (!subject || !body) {
          return NextResponse.json(
            { success: false, error: "Subject and body are required" },
            { status: 400 }
          );
        }

        // Check if Resend is configured
        if (!resend) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Email service not configured. Please add RESEND_API_KEY to environment variables.",
            },
            { status: 500 }
          );
        }

        const fromEmail = process.env.RESEND_FROM || "hello@kavisha.ai";
        const fromName = brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : null;
        const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
        const bodyHtml = typeof body === "string" ? body : "";
        const html = wrapCentered(bodyHtml + getKavishaFooterHtml());
        const allEmails = recipients.map((r) => ({ from, to: [r.email], subject, html }));
        const delay = (ms) => new Promise((r) => setTimeout(r, ms));

        for (let i = 0; i < allEmails.length; i += 100) {
          const chunk = allEmails.slice(i, i + 100);
          const { error } = await resend.batch.send(chunk);
          if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
          }
          await delay(500);
        }

        return NextResponse.json({
          success: true,
          message: `Sent to ${recipients.length} recipients.`,
        });
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to send emails",
            details: error.message,
          },
          { status: 500 }
        );
      }
    },
  });
}
