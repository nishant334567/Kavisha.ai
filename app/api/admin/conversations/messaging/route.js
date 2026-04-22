import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/app/lib/db";
import Conversations from "@/app/models/Conversations";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { getUserFromDB } from "@/app/lib/firebase/get-user";

/**
 * PATCH — brand admin closes or reopens a DM: sets / clears blockedUserId (the non-admin participant).
 * Body: { connectionId: string, brand: string, closed: boolean }
 */
export async function PATCH(request) {
  return withAuth(request, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const body = await request.json();
        const { connectionId, brand, closed } = body;

        if (!connectionId || typeof connectionId !== "string") {
          return NextResponse.json(
            { success: false, error: "connectionId is required" },
            { status: 400 }
          );
        }
        if (!brand || typeof brand !== "string") {
          return NextResponse.json(
            { success: false, error: "brand is required" },
            { status: 400 }
          );
        }
        if (typeof closed !== "boolean") {
          return NextResponse.json(
            { success: false, error: "closed must be a boolean" },
            { status: 400 }
          );
        }

        const isAdmin = await isBrandAdmin(decodedToken.email, brand.trim());
        if (!isAdmin) {
          return NextResponse.json(
            { success: false, error: "Forbidden" },
            { status: 403 }
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
        }).lean();

        if (!conv) {
          return NextResponse.json(
            { success: false, error: "Conversation not found" },
            { status: 404 }
          );
        }

        const adminId = String(dbUser.id);
        const a = conv.userA?.toString?.() ?? String(conv.userA);
        const b = conv.userB?.toString?.() ?? String(conv.userB);
        if (adminId !== a && adminId !== b) {
          return NextResponse.json(
            { success: false, error: "You are not a participant in this conversation" },
            { status: 403 }
          );
        }

        const otherId = a === adminId ? conv.userB : conv.userA;
        const setFields =
          closed && otherId
            ? {
                blockedUserId: new mongoose.Types.ObjectId(String(otherId)),
                reopenRequestedAt: null,
              }
            : {
                blockedUserId: null,
                reopenRequestedAt: null,
              };

        await Conversations.updateOne(
          { connectionId: connectionId.trim() },
          { $set: setFields }
        );

        const updated = await Conversations.findOne({
          connectionId: connectionId.trim(),
        })
          .select("blockedUserId reopenRequestedAt")
          .lean();

        const blockedUserId = updated?.blockedUserId
          ? String(updated.blockedUserId)
          : null;

        return NextResponse.json({
          success: true,
          blockedUserId,
          closed: Boolean(blockedUserId),
          reopenRequestedAt: updated?.reopenRequestedAt
            ? new Date(updated.reopenRequestedAt).toISOString()
            : null,
        });
      } catch (err) {
        console.error("[admin/conversations/messaging]", err);
        return NextResponse.json(
          { success: false, error: err?.message || "Failed to update" },
          { status: 500 }
        );
      }
    },
  });
}
