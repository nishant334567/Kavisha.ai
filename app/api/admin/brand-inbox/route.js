import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import Conversations from "@/app/models/Conversations";
import Messages from "@/app/models/Messages";
import User from "@/app/models/Users";

/**
 * Admin brand inbox list.
 * Only returns brand_inbox conversations for this brand that have at least one admin-sent message.
 * Query: ?brand=<subdomain>
 */
export async function GET(request) {
  return withAuth(request, {
    onAuthenticated: async ({ decodedToken }) => {
      const brand = request.nextUrl.searchParams.get("brand")?.trim();
      if (!brand) {
        return NextResponse.json({ error: "brand required" }, { status: 400 });
      }
      const brandKey = brand.toLowerCase();

      const ok = await isBrandAdmin(decodedToken.email, brandKey);
      if (!ok) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      try {
        await connectDB();

        const convs = await Conversations.find({
          type: "brand_inbox",
          brand: brandKey,
        })
          .select("connectionId endUserId updatedAt")
          .sort({ updatedAt: -1 })
          .lean();

        if (!Array.isArray(convs) || convs.length === 0) {
          return NextResponse.json({ conversations: [] });
        }

        const connectionIds = convs
          .map((c) => c.connectionId)
          .filter((id) => typeof id === "string" && id.length > 0);

        // Only keep conversations where admin has sent at least one message.
        const initiatedIds = await Messages.distinct("conversationId", {
          conversationId: { $in: connectionIds },
          senderRole: "admin",
        });
        const initiatedSet = new Set(
          (initiatedIds || []).map((x) => String(x))
        );

        const initiatedConvs = convs.filter((c) =>
          initiatedSet.has(String(c.connectionId))
        );
        if (initiatedConvs.length === 0) {
          return NextResponse.json({ conversations: [] });
        }

        const rows = await Promise.all(
          initiatedConvs.map(async (c) => {
            const cid = String(c.connectionId);
            // Prefer parsing from canonical connectionId `${brand}_${endUserId}` to avoid stale/incorrect endUserId writes.
            const endUserIdRaw = cid.startsWith(brandKey + "_")
              ? cid.slice((brandKey + "_").length)
              : c.endUserId != null
                ? String(c.endUserId)
                : "";

            const [endUser, lastMsg] = await Promise.all([
              endUserIdRaw
                ? User.findById(endUserIdRaw).select("name email").lean()
                : null,
              Messages.findOne({ conversationId: cid })
                .sort({ createdAt: -1 })
                .select("content createdAt senderRole senderName")
                .lean(),
            ]);

            return {
              connectionId: cid,
              endUserId: endUserIdRaw || null,
              otherUser: endUser?.name || "Unknown user",
              otherUserEmail: endUser?.email || "",
              lastMessage: lastMsg?.content || "",
              lastMessageTime: lastMsg?.createdAt || null,
              lastSenderRole: lastMsg?.senderRole || null,
              lastSenderName: lastMsg?.senderName || null,
            };
          })
        );

        return NextResponse.json({ conversations: rows });
      } catch (e) {
        console.error("[admin/brand-inbox]", e);
        return NextResponse.json(
          { error: "Failed to load inbox" },
          { status: 500 }
        );
      }
    },
    onUnauthenticated: async () =>
      NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
  });
}

