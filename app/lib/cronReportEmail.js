import { Resend } from "resend";

const CRON_REPORT_EMAIL = "hello@kavisha.ai";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Email hello@kavisha.ai when cron jobs finish (success or failure).
 * No-op if RESEND_API_KEY is unset.
 *
 * @param {{ subject: string, html: string }} opts
 */
export async function sendCronReport({ subject, html }) {
  if (!resend) return;
  try {
    await resend.emails.send({
      from: CRON_REPORT_EMAIL,
      to: [CRON_REPORT_EMAIL],
      subject,
      html,
    });
  } catch (e) {
    console.error("[cron] email report failed:", e);
  }
}
