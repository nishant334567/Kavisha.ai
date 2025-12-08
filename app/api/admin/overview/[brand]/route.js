import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";

// GET /api/admin/overview/[brand]
// Returns all sessions for the specified brand (admin only)
export async function GET(req, { params }) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        await connectDB();

        const brand = (params?.brand || "").trim().toLowerCase();

        if (!brand) {
          return NextResponse.json(
            { success: false, message: "Missing brand parameter" },
            { status: 400 }
          );
        }

        // Check if user is admin for this brand
        const isAdmin = await isBrandAdmin(decodedToken.email, brand);

        if (!isAdmin) {
          return NextResponse.json(
            { success: false, message: "Forbidden - not a brand admin" },
            { status: 403 }
          );
        }

        // Fetch all sessions for this brand
        const sessions = await Session.find({ brand })
          .populate("userId", "name email _id")
          .sort({ createdAt: -1 })
          .lean();

        // Format sessions data
        const formattedSessions = sessions.map((session) => {
          const inputTokens = session.totalInputTokens || 0;
          const outputTokens = session.totalOutputTokens || 0;
          // Calculate cost in INR: Input $0.30/1M, Output $2.50/1M, 1 USD = 88 INR
          const totalCostUSD =
            (inputTokens / 1000000) * 0.3 + (outputTokens / 1000000) * 2.5;
          const totalCost = totalCostUSD * 88;

          return {
            _id: session._id,
            brand: session.brand,
            role: session.role,
            status: session.status,
            title: session.title,
            chatSummary: session.chatSummary || "",
            allDataCollected: !!session.allDataCollected,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
            assignedTo: session.assignedTo,
            comment: session.comment || "",
            totalInputTokens: inputTokens,
            totalOutputTokens: outputTokens,
            totalCost: totalCost,
            user: {
              name: session.userId?.name || "",
              email: session.userId?.email || "",
              _id: session.userId?._id || "",
            },
          };
        });

        return NextResponse.json({
          success: true,
          brand,
          sessions: formattedSessions,
          total: formattedSessions.length,
        });
      } catch (error) {
        return NextResponse.json(
          { success: false, message: "Failed to fetch brand sessions" },
          { status: 500 }
        );
      }
    },
  });
}

//i am just updating this file to make sure i am being engaged in some sort of q
