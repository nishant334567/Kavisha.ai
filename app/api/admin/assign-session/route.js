import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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
        if (messageText && emails.length > 0 && resend) {
          const subject = "You have been assigned to a chat session";
          const body = messageText;
          const brand = session.brand || "Kavisha";
          try {
            await Promise.all(
              emails.map((email) =>
                resend.emails.send({
                  from: "hello@kavisha.ai",
                  to: [email],
                  subject,
                  html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                      <h2 style="color: #333; margin: 0;">Session assignment</h2>
                    </div>
                    <div style="line-height: 1.6; color: #555;">${body.replace(/\n/g, "<br>")}</div>
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 14px;">
                      <p>Best regards,<br>The ${brand} Team</p>
                    </div>
                  </div>
                `,
                })
              )
            );
          } catch (emailErr) {
            console.error("Assign session: email send failed", emailErr);
            // Assignment still succeeds; email is best-effort
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
