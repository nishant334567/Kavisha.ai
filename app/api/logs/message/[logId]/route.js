import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/app/lib/db";
import Logs from "@/app/models/ChatLogs";
import Session from "@/app/models/ChatSessions";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { createOrGetUser } from "@/app/lib/firebase/create-user";

export async function POST(req, { params }) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const { logId } = await params;
        if (!logId || !mongoose.Types.ObjectId.isValid(logId)) {
          return NextResponse.json({ error: "Invalid log id" }, { status: 400 });
        }

        let body;
        try {
          body = await req.json();
        } catch {
          return NextResponse.json({ error: "Invalid body" }, { status: 400 });
        }

        const action = body?.action;
        if (action !== "like" && action !== "share") {
          return NextResponse.json(
            { error: "action must be like or share" },
            { status: 400 }
          );
        }

        await connectDB();
        const dbUser = await createOrGetUser(decodedToken);
        const userId = dbUser._id.toString();

        const log = await Logs.findById(logId).select("sessionId role").lean();
        if (!log) {
          return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        if (log.role !== "assistant") {
          return NextResponse.json({ error: "Invalid log type" }, { status: 400 });
        }

        const session = await Session.findById(log.sessionId)
          .select("userId")
          .lean();
        if (!session || String(session.userId) !== userId) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const inc = action === "like" ? { likeCount: 1 } : { shareCount: 1 };
        const updated = await Logs.findByIdAndUpdate(
          logId,
          { $inc: inc },
          { new: true, select: "likeCount shareCount" }
        ).lean();

        return NextResponse.json({
          likeCount: updated?.likeCount ?? 0,
          shareCount: updated?.shareCount ?? 0,
        });
      } catch (err) {
        console.error("[logs/message POST]", err);
        return NextResponse.json(
          { error: "Failed to update" },
          { status: 500 }
        );
      }
    },
    onUnauthenticated: async () =>
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  });
}
