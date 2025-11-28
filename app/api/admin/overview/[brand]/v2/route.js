import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";

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

        const isAdmin = await isBrandAdmin(decodedToken.email, brand);

        if (!isAdmin) {
          return NextResponse.json(
            { success: false, message: "Forbidden - not a brand admin" },
            { status: 403 }
          );
        }

        const sessions = await Session.find({ brand })
          .populate("userId", "name email _id")
          .sort({ createdAt: -1 })
          .lean();

        const formattedSessions = sessions.map((session) => ({
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
          user: {
            name: session.userId?.name || "",
            email: session.userId?.email || "",
            _id: session.userId?._id || "",
          },
        }));

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
