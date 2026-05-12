import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/app/lib/db";
import Logs from "@/app/models/ChatLogs";
import Session from "@/app/models/ChatSessions";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { createOrGetUser } from "@/app/lib/firebase/create-user";

function effectiveLiked(doc) {
  return doc?.liked === true;
}

function effectiveCopied(doc) {
  return doc?.copied === true;
}

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
        if (action !== "like" && action !== "unlike" && action !== "copy") {
          return NextResponse.json(
            { error: "action must be like, unlike, or copy" },
            { status: 400 }
          );
        }

        await connectDB();
        const dbUser = await createOrGetUser(decodedToken);
        const userId = dbUser._id.toString();

        const log = await Logs.findById(logId)
          .select("sessionId role liked copied")
          .lean();
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

        if (action === "like") {
          await Logs.updateOne({ _id: logId }, { $set: { liked: true } });
        } else if (action === "unlike") {
          await Logs.updateOne({ _id: logId }, { $set: { liked: false } });
        } else if (action === "copy" && log.copied !== true) {
          await Logs.updateOne({ _id: logId }, { $set: { copied: true } });
        }

        const updated = await Logs.findById(logId)
          .select("liked copied")
          .lean();

        return NextResponse.json({
          liked: effectiveLiked(updated),
          copied: effectiveCopied(updated),
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
