import Matches from "@/app/models/Matches";
import Session from "@/app/models/ChatSessions";
import User from "@/app/models/Users";
import { connectDB } from "@/app/lib/db";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await connectDB();

    // Fetch all matches with enhanced details
    const matches = await Matches.find({})
      .select(
        "sessionId matchedUserId matchedUserName matchedUserEmail matchPercentage matchingReason mismatchReason chatSummary contacted createdAt"
      )
      .sort({ createdAt: -1 }); // Most recent first

    // Enhance matches with session and user information
    const enhancedMatches = await Promise.all(
      matches.map(async (match) => {
        try {
          // Get session details (who initiated the match)
          const session = await Session.findById(match.sessionId).select(
            "userId title role"
          );

          // Get session owner details
          const sessionOwner = await User.findById(session?.userId).select(
            "name email"
          );

          // Get matched user details (if not already available)
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
              name: "Unknown",
              email: "N/A",
              sessionTitle: "Unknown",
              sessionRole: "Unknown",
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
      totalMatches: enhancedMatches.length,
      matches: enhancedMatches,
    });
  } catch (error) {
    console.error("Error fetching all matches:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch all matches",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
