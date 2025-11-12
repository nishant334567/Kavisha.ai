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

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
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

    // Send emails to all recipients
    const emailPromises = recipients.map(async (recipient) => {
      try {
        const emailData = {
          from: "hello@kavisha.ai", // Use Resend's test domain first
          to: [recipient.email],
          subject: subject,
          html: `
             <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
               <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                 <h2 style="color: #333; margin: 0;">Hello ${recipient.name || "User"},</h2>
               </div>
               
               <div style="line-height: 1.6; color: #555;">
                 ${body.replace(/\n/g, "<br>")}
               </div>
               
               <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 14px;">
                 <p>Best regards,<br>The ${brand || "Kavisha"} Team</p>
               </div>
             </div>
           `,
        };


        const { data, error } = await resend.emails.send(emailData);

        if (error) {
          console.error(`Failed to send email to ${recipient.email}:`, error);
          return {
            email: recipient.email,
            success: false,
            error: error.message,
          };
        }

        return { email: recipient.email, success: true, messageId: data.id };
      } catch (error) {
        console.error(`Error sending email to ${recipient.email}:`, error);
        return { email: recipient.email, success: false, error: error.message };
      }
    });

    const results = await Promise.all(emailPromises);

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
    console.error("Bulk email sending error:", error);
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
