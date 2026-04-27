import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { createOrGetUser } from "@/app/lib/firebase/create-user";
import { client as sanity } from "@/app/lib/sanity";
import Conversations from "@/app/models/Conversations";
import Messages from "@/app/models/Messages";
import User from "@/app/models/Users";

/** Count brand-admin → user DM messages created after `since` (widget Bearer auth). */
export async function GET(request) {
  return withAuth(request, {
    onAuthenticated: async ({ decodedToken }) => {
      const brand = request.nextUrl.searchParams.get("brand")?.trim();
      const sinceRaw = request.nextUrl.searchParams.get("since")?.trim();
      if (!brand) {
        return NextResponse.json({ error: "brand required" }, { status: 400 });
      }
      if (!sinceRaw) {
        return NextResponse.json({ error: "since required" }, { status: 400 });
      }
      const sinceDate = new Date(sinceRaw);
      if (Number.isNaN(sinceDate.getTime())) {
        return NextResponse.json({ error: "invalid since" }, { status: 400 });
      }

      try {
        await connectDB();
        const dbUser = await createOrGetUser(decodedToken);
        const viewerId = dbUser._id;

        if (!sanity) {
          return NextResponse.json({ unreadCount: 0 });
        }

        const brandDoc = await sanity.fetch(
          `*[_type == "brand" && subdomain == $brand][0]{ "emails": admins }`,
          { brand }
        );
        const emails = Array.isArray(brandDoc?.emails)
          ? brandDoc.emails.map((e) => String(e || "").trim().toLowerCase()).filter(Boolean)
          : [];
        if (emails.length === 0) {
          return NextResponse.json({ unreadCount: 0 });
        }

        const adminUsers = await User.find({
          email: { $in: emails },
        })
          .select("_id")
          .lean();
        const adminIds = adminUsers.map((u) => u._id).filter(Boolean);
        if (adminIds.length === 0) {
          return NextResponse.json({ unreadCount: 0 });
        }

        const convs = await Conversations.find({
          $or: [
            { userA: viewerId, userB: { $in: adminIds } },
            { userB: viewerId, userA: { $in: adminIds } },
          ],
        })
          .select("connectionId")
          .lean();

        const connectionIds = convs
          .map((c) => c.connectionId)
          .filter((id) => typeof id === "string" && id.length > 0);
        if (connectionIds.length === 0) {
          return NextResponse.json({ unreadCount: 0 });
        }

        const unreadCount = await Messages.countDocuments({
          conversationId: { $in: connectionIds },
          senderId: { $in: adminIds },
          createdAt: { $gt: sinceDate },
        });

        return NextResponse.json({ unreadCount });
      } catch (e) {
        console.error("[widget/brand-admin-unread]", e);
        return NextResponse.json(
          { error: "Failed to count unread" },
          { status: 500 }
        );
      }
    },
    onUnauthenticated: async () =>
      NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
  });
}
