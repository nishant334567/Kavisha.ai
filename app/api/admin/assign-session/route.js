import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import User from "@/app/models/Users";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request) {
  return withAuth(request, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const { sessionId, assignedTo, message } = await request.json();

        if (!sessionId) {
          return NextResponse.json(
            { error: "Session ID is required" },
            { status: 400 }
          );
        }

        await connectDB();

        const session = await Session.findById(sessionId).lean();
        if (!session) {
          return NextResponse.json(
            { error: "Session not found" },
            { status: 404 }
          );
        }

        let peerName = "";
        let peerEmail = "";
        if (session.userId) {
          try {
            const peer = await User.findById(session.userId)
              .select("name email")
              .lean();
            if (peer) {
              peerName = typeof peer.name === "string" ? peer.name.trim() : "";
              peerEmail =
                typeof peer.email === "string" ? peer.email.trim() : "";
            }
          } catch {
            /* ignore */
          }
        }

        const sessionTitle =
          typeof session.title === "string" && session.title.trim()
            ? session.title.trim()
            : "—";
        const sessionIdStr = String(session._id);

        const isAdmin = await isBrandAdmin(decodedToken.email, session.brand);
        if (!isAdmin) {
          return NextResponse.json(
            { error: "Forbidden - not a brand admin" },
            { status: 403 }
          );
        }

        const emails = Array.isArray(assignedTo)
          ? assignedTo.filter((e) => typeof e === "string" && e.trim())
          : assignedTo != null && String(assignedTo).trim()
            ? [String(assignedTo).trim()]
            : [];
        const updatedSession = await Session.findByIdAndUpdate(
          sessionId,
          { assignedTo: emails },
          { new: true, lean: true }
        );

        const messageText = typeof message === "string" ? message.trim() : "";
        const brandLabel = session.brand || "Kavisha";

        if (emails.length > 0 && resend) {
          const subject = `Assigned — ${sessionTitle}`;
          const optionalNote = messageText
            ? `<div style="margin-top:20px;padding:14px;background:#f8f9fa;border-radius:8px;line-height:1.6;color:#333;">
                <p style="margin:0 0 8px;font-weight:600;">Note from admin</p>
                <div>${escapeHtml(messageText).replace(/\n/g, "<br>")}</div>
              </div>`
            : "";
          const detailTable = `
            <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:14px;color:#333;">
              <tr>
                <td style="padding:10px 12px;border:1px solid #e5e5e5;background:#fafafa;width:38%;"><strong>Session title</strong></td>
                <td style="padding:10px 12px;border:1px solid #e5e5e5;">${escapeHtml(sessionTitle)}</td>
              </tr>
              <tr>
                <td style="padding:10px 12px;border:1px solid #e5e5e5;background:#fafafa;"><strong>Session ID</strong></td>
                <td style="padding:10px 12px;border:1px solid #e5e5e5;"><code style="font-size:13px;">${escapeHtml(sessionIdStr)}</code></td>
              </tr>
              <tr>
                <td style="padding:10px 12px;border:1px solid #e5e5e5;background:#fafafa;"><strong>Customer name</strong></td>
                <td style="padding:10px 12px;border:1px solid #e5e5e5;">${escapeHtml(peerName || "—")}</td>
              </tr>
              <tr>
                <td style="padding:10px 12px;border:1px solid #e5e5e5;background:#fafafa;"><strong>Customer email</strong></td>
                <td style="padding:10px 12px;border:1px solid #e5e5e5;">${escapeHtml(peerEmail || "—")}</td>
              </tr>
              <tr>
                <td style="padding:10px 12px;border:1px solid #e5e5e5;background:#fafafa;"><strong>Assigned to</strong></td>
                <td style="padding:10px 12px;border:1px solid #e5e5e5;">{{ASSIGNEE_EMAIL}}</td>
              </tr>
            </table>`;

          try {
            await Promise.all(
              emails.map((assigneeEmail) => {
                const htmlBody = `
                  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px;">
                    <div style="padding-bottom: 16px; border-bottom: 2px solid #004a4e;">
                      <h1 style="margin: 0; font-size: 20px; color: #1a1a1a;">Chat session assignment</h1>
                      <p style="margin: 8px 0 0; font-size: 14px; color: #555;">You have been assigned to handle this session for <strong>${escapeHtml(brandLabel)}</strong>.</p>
                    </div>
                    ${detailTable.replace("{{ASSIGNEE_EMAIL}}", escapeHtml(assigneeEmail))}
                    ${optionalNote}
                    <p style="margin-top: 28px; font-size: 13px; color: #888;">Open <strong>Chat Requests</strong> in your admin to view logs and reply.</p>
                    <p style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee; font-size: 14px; color: #666;">
                      Best regards,<br /><span style="color: #333;">The ${escapeHtml(brandLabel)} team</span>
                    </p>
                  </div>`;
                return resend.emails.send({
                  from: "hello@kavisha.ai",
                  to: [assigneeEmail],
                  subject,
                  html: htmlBody,
                });
              })
            );
          } catch (emailErr) {
            console.error("Assign session: email send failed", emailErr);
          }
        }

        return NextResponse.json({
          success: true,
          message: "Session assignment updated successfully",
          session: updatedSession,
        });
      } catch (error) {
        console.error("Assign session error:", error);
        return NextResponse.json(
          {
            error: "Failed to update session assignment",
            details: error?.message || String(error),
          },
          { status: 500 }
        );
      }
    },
  });
}
