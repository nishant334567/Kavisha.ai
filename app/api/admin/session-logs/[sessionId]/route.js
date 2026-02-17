import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Logs from "@/app/models/ChatLogs";
import Session from "@/app/models/ChatSessions";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";

// GET /api/admin/session-logs/[sessionId]
// Returns chat logs for a specific session (admin only)
export async function GET(req, { params }) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        await connectDB();

        const { sessionId } = await params;

        if (!sessionId) {
          return NextResponse.json(
            { success: false, message: "Missing sessionId parameter" },
            { status: 400 }
          );
        }

        const sessionDoc = await Session.findById(sessionId)
          .populate("userId", "name email")
          .lean();
        if (!sessionDoc) {
          return NextResponse.json(
            { success: false, message: "Session not found" },
            { status: 404 }
          );
        }

        const isAdmin = await isBrandAdmin(decodedToken.email, sessionDoc.brand);
        if (!isAdmin) {
          return NextResponse.json(
            { success: false, message: "Forbidden - not a brand admin" },
            { status: 403 }
          );
        }

        const logs = await Logs.find({ sessionId })
          .sort({ createdAt: 1 })
          .lean();

        const session = {
          _id: sessionDoc._id,
          brand: sessionDoc.brand,
          title: sessionDoc.title,
          chatSummary: sessionDoc.chatSummary,
          status: sessionDoc.status,
          assignedTo: sessionDoc.assignedTo || "",
          serviceKey: sessionDoc.serviceKey,
          createdAt: sessionDoc.createdAt,
          updatedAt: sessionDoc.updatedAt,
          messageCount: logs.length,
          user: sessionDoc.userId
            ? { name: sessionDoc.userId.name, email: sessionDoc.userId.email }
            : null,
        };

        return NextResponse.json({
          success: true,
          session,
          logs: logs.map((log) => ({
            _id: log._id,
            message: log.message,
            role: log.role,
            createdAt: log.createdAt,
            sourceUrls: log.sourceUrls || [],
            sourceChunkIds: log.sourceChunkIds || [],
          })),
          total: logs.length,
        });
      } catch (error) {
        return NextResponse.json(
          { success: false, message: "Failed to fetch session logs" },
          { status: 500 }
        );
      }
    },
  });
}
