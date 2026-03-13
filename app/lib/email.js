import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// sendEmail({ to, from, subject, body, attachments? }) — uses Resend when RESEND_API_KEY is set
// attachments: [{ filename: string, content: Buffer }]
export async function sendEmail({ to, from, subject, body, attachments }) {
    if (!resend) return { ok: false, error: "Email not configured" };
    const toList = Array.isArray(to) ? to : [to].filter(Boolean);
    if (!toList.length || !from || !subject) return { ok: false, error: "Missing to, from or subject" };
    try {
        const payload = {
            from,
            to: toList,
            subject,
            html: body || "",
        };
        if (Array.isArray(attachments) && attachments.length > 0) {
            payload.attachments = attachments.map((a) => ({
                filename: a.filename || "attachment",
                content: Buffer.isBuffer(a.content) ? a.content : Buffer.from(String(a.content), "utf-8"),
            }));
        }
        const { data, error } = await resend.emails.send(payload);
        if (error) return { ok: false, error: error.message };
        return { ok: true };
    } catch (e) {
        return { ok: false, error: e?.message ?? "Send failed" };
    }
}
