import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import { withAuth } from "@/app/lib/firebase/auth-middleware";

export async function GET(req, { params }) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const { sessionId } = await params;
        await connectDB();
        const session = await Session.findById(sessionId).select("role title");

        if (!session) {
          return NextResponse.json(
            { error: "Session not found" },
            { status: 404 }
          );
        }

        return NextResponse.json({
          role: session.role,
          title: session.title,
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
