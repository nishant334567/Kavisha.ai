import { NextResponse } from "next/server";
import { EmailTemplate } from "@/app/components/EmailTemplate";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Static email addresses to send cron emails to
const CRON_EMAILS = [
  "nishantkumar334567@gmail.com",
  "nishantmittal2410@gmail.com",
  // Add more email addresses as needed
];

export async function GET() {
  try {
    const emailPromises = CRON_EMAILS.map(async (email) => {
      try {
        const { data, error } = await resend.emails.send({
          from: "team@kavisha.ai",
          to: email,
          subject: "Kavisha Performing Daily Scheduled Task",
          react: EmailTemplate({
            profileType: "cron",
            senderName: "Kavisha",
            jobTitle: "Daily System Report",
            matchPercentage: "100%",
            receiverEmail: email,
          }),
        });

        if (error) {
          console.error(`Failed to send email to ${email}:`, error);
          return { email, success: false, error };
        }

        console.log(`Email sent successfully to ${email}`);
        return { email, success: true, data };
      } catch (error) {
        console.error(`Error sending email to ${email}:`, error);
        return { email, success: false, error: error.message };
      }
    });

    const results = await Promise.all(emailPromises);
    const successfulEmails = results.filter((result) => result.success);
    const failedEmails = results.filter((result) => !result.success);

    return NextResponse.json({
      message: "hello from cron",
      timestamp: new Date().toISOString(),
      emailsSent: successfulEmails.length,
      emailsFailed: failedEmails.length,
      totalEmails: CRON_EMAILS.length,
      results: results,
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      {
        message: "hello from cron",
        error: error.message || "Internal server error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
