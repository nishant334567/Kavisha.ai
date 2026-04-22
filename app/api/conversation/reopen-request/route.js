import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import Conversations from "@/app/models/Conversations";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { getUserFromDB } from "@/app/lib/firebase/get-user";

/**
 * POST — blocked participant asks admins to reopen the DM.
 * Body: { connectionId: string }
 */
export async function POST(request) {
  return withAuth(request, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const body = await request.json();
        const { connectionId } = body;

        if (!connectionId || typeof connectionId !== "string") {
          return NextResponse.json(
            { success: false, error: "connectionId is required" },
            { status: 400 }
          );
        }

        const dbUser = await getUserFromDB(decodedToken.email);
        if (!dbUser?.id) {
          return NextResponse.json(
            { success: false, error: "User not found" },
            { status: 404 }
          );
        }

        await connectDB();

        const conv = await Conversations.findOne({
          connectionId: connectionId.trim(),
        })
          .select("blockedUserId reopenRequestedAt userA userB")
          .lean();

        if (!conv) {
          return NextResponse.json(
            { success: false, error: "Conversation not found" },
            { status: 404 }
          );
        }

        const blocked = conv.blockedUserId
          ? String(conv.blockedUserId)
          : null;
        if (!blocked || String(dbUser.id) !== blocked) {
          return NextResponse.json(
            {
              success: false,
              error: "You can only request a reopen when this chat is closed for you.",
            },
            { status: 403 }
          );
        }

        if (conv.reopenRequestedAt) {
          return NextResponse.json({
            success: true,
            alreadyPending: true,
            reopenRequestedAt: new Date(conv.reopenRequestedAt).toISOString(),
          });
        }

        const now = new Date();
        await Conversations.updateOne(
          { connectionId: connectionId.trim() },
          { $set: { reopenRequestedAt: now } }
        );

        return NextResponse.json({
          success: true,
          reopenRequestedAt: now.toISOString(),
        });
      } catch (err) {
        console.error("[conversation/reopen-request]", err);
        return NextResponse.json(
          { success: false, error: err?.message || "Failed to submit request" },
          { status: 500 }
        );
      }
    },
  });
}
