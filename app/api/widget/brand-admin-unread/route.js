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
      const brandKey = brand.trim().toLowerCase();
      const sinceDate = new Date(sinceRaw);
      if (Number.isNaN(sinceDate.getTime())) {
        return NextResponse.json({ error: "invalid since" }, { status: 400 });
      }

      try {
        await connectDB();
        const dbUser = await createOrGetUser(decodedToken);
        const viewerId = String(dbUser._id);

        const unreadCount = await Messages.countDocuments({
          conversationId: `${brandKey}_${viewerId}`,
          senderRole: "admin",
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
