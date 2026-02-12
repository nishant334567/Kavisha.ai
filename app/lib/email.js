import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// sendEmail({ to, from, subject, body }) — uses Resend when RESEND_API_KEY is set
export async function sendEmail({ to, from, subject, body }) {
    if (!resend) return { ok: false, error: "Email not configured" };
    const toList = Array.isArray(to) ? to : [to].filter(Boolean);
    if (!toList.length || !from || !subject) return { ok: false, error: "Missing to, from or subject" };
    try {
        const { data, error } = await resend.emails.send({
            from,
            to: toList,
            subject,
            html: body || "",
        });
        if (error) return { ok: false, error: error.message };
        return { ok: true };
    } catch (e) {
        return { ok: false, error: e?.message ?? "Send failed" };
    }
}
