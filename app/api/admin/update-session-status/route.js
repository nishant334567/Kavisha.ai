import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";

export async function POST(request) {
  return withAuth(request, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const { sessionId, status } = await request.json();

        if (!sessionId || !status) {
          return NextResponse.json(
            { error: "Session ID and status are required" },
            { status: 400 }
          );
        }

        await connectDB();

        // Get session to check brand
        const session = await Session.findById(sessionId).lean();
        if (!session) {
          return NextResponse.json(
            { error: "Session not found" },
            { status: 404 }
          );
        }

        // Check if user is admin for this brand
        const isAdmin = await isBrandAdmin(decodedToken.email, session.brand);
        if (!isAdmin) {
          return NextResponse.json(
            { error: "Forbidden - not a brand admin" },
            { status: 403 }
          );
        }

        const updatedSession = await Session.findByIdAndUpdate(
          sessionId,
          { status },
          { new: true }
        );

        return NextResponse.json({
          success: true,
          message: "Status updated successfully",
          session: updatedSession,
        });
      } catch (error) {
        console.error("Error updating session status:", error);
        return NextResponse.json(
          { error: "Failed to update session status" },
          { status: 500 }
        );
      }
    },
  });
}
