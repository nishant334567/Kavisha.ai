import Matches from "@/app/models/Matches";
import Session from "@/app/models/ChatSessions";
import User from "@/app/models/Users";
import { connectDB } from "@/app/lib/db";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  try {
    await connectDB();

    const { sessionId } = params;

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          message: "Session ID is required",
        },
        { status: 400 }
      );
    }

    // Get session details first
    const session =
      await Session.findById(sessionId).select("userId title role");
    const sessionOwner = await User.findById(session?.userId).select(
      "name email"
    );

    // Fetch all matches for this session
    const matches = await Matches.find({ sessionId })
      .select(
        "matchedUserId matchedUserName matchedUserEmail matchPercentage matchingReason mismatchReason chatSummary contacted createdAt"
      )
      .sort({ createdAt: -1 }); // Most recent first

    // Enhance matches with user details
    const enhancedMatches = await Promise.all(
      matches.map(async (match) => {
        try {
          // Get matched user details
          const matchedUser = await User.findById(match.matchedUserId).select(
            "name email"
          );

          return {
            ...match.toObject(),
            fromUser: {
              name: sessionOwner?.name || "Unknown",
              email: sessionOwner?.email || "N/A",
              sessionTitle: session?.title || "Unknown Session",
              sessionRole: session?.role || "Unknown",
            },
            toUser: {
              name: matchedUser?.name || match.matchedUserName || "Unknown",
              email: matchedUser?.email || match.matchedUserEmail || "N/A",
            },
          };
        } catch (error) {
          console.error("Error enhancing match:", error);
          return {
            ...match.toObject(),
            fromUser: {
              name: sessionOwner?.name || "Unknown",
              email: sessionOwner?.email || "N/A",
              sessionTitle: session?.title || "Unknown Session",
              sessionRole: session?.role || "Unknown",
            },
            toUser: {
              name: match.matchedUserName || "Unknown",
              email: match.matchedUserEmail || "N/A",
            },
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      sessionId: sessionId,
      totalMatches: enhancedMatches.length,
      matches: enhancedMatches,
    });
  } catch (error) {
    console.error("Error fetching session matches:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch session matches",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
