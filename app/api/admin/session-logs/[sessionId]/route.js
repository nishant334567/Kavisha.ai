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

        // Get the session to check brand
        const session = await Session.findById(sessionId).lean();
        if (!session) {
          return NextResponse.json(
            { success: false, message: "Session not found" },
            { status: 404 }
          );
        }

        // Check if user is admin for this brand
        const isAdmin = await isBrandAdmin(decodedToken.email, session.brand);

        if (!isAdmin) {
          return NextResponse.json(
            { success: false, message: "Forbidden - not a brand admin" },
            { status: 403 }
          );
        }

        // Fetch logs for this session
        const logs = await Logs.find({ sessionId })
          .sort({ createdAt: 1 })
          .lean();

        return NextResponse.json({
          success: true,
          logs: logs.map((log) => ({
            _id: log._id,
            message: log.message,
            role: log.role,
            createdAt: log.createdAt,
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
