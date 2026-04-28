import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { createOrGetUser } from "@/app/lib/firebase/create-user";
import { client as sanity } from "@/app/lib/sanity";
import Conversations from "@/app/models/Conversations";
import User from "@/app/models/Users";

/**
 * Resolve 1:1 thread between the signed-in user and the brand team (Sanity admins).
 * Prefers an existing conversation with any admin; otherwise uses the first admin user.
 */
export async function GET(request) {
  return withAuth(request, {
    onAuthenticated: async ({ decodedToken }) => {
      const brand = request.nextUrl.searchParams.get("brand")?.trim();
      if (!brand) {
        return NextResponse.json({ error: "brand required" }, { status: 400 });
      }
      const brandKey = brand.trim().toLowerCase();

      try {
        await connectDB();
        const dbUser = await createOrGetUser(decodedToken);
        const viewerId = String(dbUser._id);

        if (!sanity) {
          return NextResponse.json(
            { error: "Service configuration unavailable" },
            { status: 500 }
          );
        }

        const brandDoc = await sanity.fetch(
          `*[_type == "brand" && subdomain == $brand][0]{ "emails": admins }`,
          { brand }
        );
        const emails = Array.isArray(brandDoc?.emails)
          ? brandDoc.emails
              .map((e) => String(e || "").trim().toLowerCase())
              .filter(Boolean)
          : [];
        if (emails.length === 0) {
          return NextResponse.json(
            { error: "No brand admins configured" },
            { status: 404 }
          );
        }

        const adminUsers = await User.find({ email: { $in: emails } })
          .select("_id name email")
          .lean();
        const adminIds = adminUsers.map((u) => u._id).filter(Boolean);
        if (adminIds.length === 0) {
          return NextResponse.json(
            { error: "No admin accounts found for this brand" },
            { status: 404 }
          );
        }

        // Brand inbox: one thread per brand + end user (independent of which admin replies).
        const connectionId = `${brandKey}_${viewerId}`;
        const peer = adminUsers[0];
        const peerId = String(peer._id);
        const peerName = peer?.name || brand;
        await Conversations.findOneAndUpdate(
          { connectionId },
          {
            $setOnInsert: {
              type: "brand_inbox",
              brand: brandKey,
              endUserId: dbUser._id,
              userA: dbUser._id,
              userB: peer._id,
              connectionId,
            },
          },
          { upsert: true, new: true }
        );

        return NextResponse.json({
          userA: viewerId,
          userB: peerId,
          connectionId,
          peerName,
          currentUserId: viewerId,
        });
      } catch (e) {
        console.error("[widget/brand-admin-inbox-open]", e);
        return NextResponse.json(
          { error: "Failed to open inbox" },
          { status: 500 }
        );
      }
    },
    onUnauthenticated: async () =>
      NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
  });
}
