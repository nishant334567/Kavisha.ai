import { NextResponse } from "next/server";
import { Resend } from "resend";
import { withAuth } from "@/app/lib/firebase/auth-middleware";

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

        const brandDisplayName = (brand || "Kavisha")
          .split(/[-_\s]+/)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(" ");

        const htmlTemplate = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="line-height: 1.6; color: #333;">
              ${body.replace(/\n/g, "<br>")}
            </div>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #555; font-size: 14px;">
              <p>Best regards,<br>The ${brandDisplayName} Team</p>
            </div>
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; color: #888; font-size: 12px; text-align: center;">
              <p style="margin: 0;">powered by <a href="https://kavisha.ai" style="color: #7981C2; text-decoration: none;">kavisha.ai</a></p>
            </div>
          </div>
        `;

        const BATCH_SIZE = 100; // Resend batch limit
        const results = [];

        for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
          const chunk = recipients.slice(i, i + BATCH_SIZE);
          const batchEmails = chunk.map((r) => ({
            from: "hello@kavisha.ai",
            to: [r.email],
            subject,
            html: htmlTemplate,
          }));

          const { data: batchResponse, error: batchError } = await resend.batch.send(batchEmails);

          if (batchError) {
            chunk.forEach((r) => results.push({ email: r.email, success: false, error: batchError.message }));
          } else {
            // API returns { data: [{ id }, ...] }; SDK wraps as { data: {...}, error: null }
            const items = batchResponse?.data || [];
            chunk.forEach((r, idx) => {
              const item = items[idx];
              results.push(
                item?.id
                  ? { email: r.email, success: true, messageId: item.id }
                  : { email: r.email, success: false, error: item?.message || "No response" }
              );
            });
          }

          // Rate limit: 2 req/sec – wait 600ms between batches
          if (i + BATCH_SIZE < recipients.length) {
            await new Promise((r) => setTimeout(r, 600));
          }
        }

        const successful = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;

        return NextResponse.json({
          success: true,
          message: `Email sending completed. ${successful} successful, ${failed} failed.`,
          results: {
            total: recipients.length,
            successful,
            failed,
            details: results,
          },
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
