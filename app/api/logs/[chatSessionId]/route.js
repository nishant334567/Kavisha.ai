import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Logs from "@/app/models/ChatLogs";
import Session from "@/app/models/ChatSessions";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { getUserFromDB } from "@/app/lib/firebase/get-user";

export async function GET(req, { params }) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const user = await getUserFromDB(decodedToken.email);
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      const { chatSessionId } = await params;
      if (!chatSessionId) {
        return NextResponse.json({ error: "Missing session id" }, { status: 400 });
      }
      try {
        await connectDB();
        const session = await Session.findById(chatSessionId);
        if (!session) {
          return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }
        if (String(session.userId) !== user.id) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const logs = await Logs.find({ sessionId: chatSessionId }).sort({
          createdAt: 1,
        });
        return NextResponse.json(logs);
      } catch (err) {
        console.error("[logs GET]", err);
        return NextResponse.json(
          { error: "Failed to fetch logs" },
          { status: 500 }
        );
      }
    },
    onUnauthenticated: async () =>
      NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
  });
}
