import { NextResponse } from "next/server";
import { Resend } from "resend";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { createUnsubscribeToken } from "@/app/lib/unsubscribe-token";
import { getKavishaFooterHtml, wrapCentered } from "@/app/lib/kavisha-email-utils";
import { connectDB } from "@/app/lib/db";
import EmailUnsubscribe from "@/app/models/EmailUnsubscribe";
import SentEmailLog from "@/app/models/SentEmailLog";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

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

        const brandVal = (brand || "kavisha").toString().trim().toLowerCase();
        await connectDB();
        const unsubscribed = await EmailUnsubscribe.find(
          { brand: brandVal },
          { email: 1, _id: 0 }
        ).lean();
        const unsubSet = new Set(unsubscribed.map((u) => u.email.toLowerCase()));
        const toSend = recipients.filter(
          (r) => r && r.email && !unsubSet.has(String(r.email).trim().toLowerCase())
        );

        if (toSend.length === 0) {
          return NextResponse.json({
            success: true,
            message: `No emails sent. All ${recipients.length} recipient(s) are unsubscribed.`,
          });
        }

        const fromEmail = process.env.RESEND_FROM || "hello@kavisha.ai";
        const fromName = brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : null;
        const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
        const bodyHtml = typeof body === "string" ? body : "";
        const allEmails = toSend.map((r) => {
          const token = createUnsubscribeToken({
            email: r.email,
            brand: brandVal,
            avatarId: r.avatarId ?? null,
          });
          const html = wrapCentered(bodyHtml + getKavishaFooterHtml(token));
          return { from, to: [r.email], subject, html };
        });
        const delay = (ms) => new Promise((r) => setTimeout(r, ms));

        function buildLogDocs(recipients, emailStatus) {
          const sentAt = new Date();
          return recipients.map((r) => ({
            brand: brandVal,
            toEmail: String(r.email).trim().toLowerCase(),
            subject: subject.trim(),
            type: "bulk",
            sentAt,
            status: emailStatus,
          }));
        }

        for (let i = 0; i < allEmails.length; i += 100) {
          const chunk = allEmails.slice(i, i + 100);
          const chunkRecipients = toSend.slice(i, i + 100);
          const { error } = await resend.batch.send(chunk);
          if (error) {
            const failedDocs = buildLogDocs(chunkRecipients, "failed");
            await SentEmailLog.insertMany(failedDocs).catch((err) => {
              console.error("SentEmailLog insertMany (failed):", err);
            });
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
          }
          await delay(500);
        }

        const logDocs = buildLogDocs(toSend, "sent");
        await SentEmailLog.insertMany(logDocs).catch((err) => {
          console.error("SentEmailLog insertMany:", err);
        });

        const skipped = recipients.length - toSend.length;
        return NextResponse.json({
          success: true,
          message: `Sent to ${toSend.length} recipients.${skipped ? ` ${skipped} skipped (unsubscribed).` : ""}`,
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
