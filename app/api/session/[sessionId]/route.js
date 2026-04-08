import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import Logs from "@/app/models/ChatLogs";
import { withAuth } from "@/app/lib/firebase/auth-middleware";

export async function GET(req, { params }) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const { sessionId } = await params;
        await connectDB();
        const session = await Session.findById(sessionId).select(
          "role title name serviceKey isCommunityChat onboardingPercent allDataCollected",
        );

        if (!session) {
          return NextResponse.json(
            { error: "Session not found" },
            { status: 404 }
          );
        }

        const messageCount = await Logs.countDocuments({ sessionId });

        const onboardingPercent =
          session.allDataCollected === true
            ? 100
            : Math.max(
                0,
                Math.min(100, Number(session.onboardingPercent) || 0),
              );

        return NextResponse.json({
          role: session.role,
          title: session.title,
          name: session.name,
          serviceKey: session.serviceKey || null,
          messageCount,
          isCommunityChat: Boolean(session.isCommunityChat),
          onboardingPercent,
          allDataCollected: Boolean(session.allDataCollected),
        });
      } catch (err) {
        return NextResponse.json(
          { error: "Failed to fetch session" },
          { status: 500 }
        );
      }
    },
  });
}
