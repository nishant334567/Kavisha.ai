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

        const existing = await Conversations.findOne({
          $or: [
            { userA: dbUser._id, userB: { $in: adminIds } },
            { userB: dbUser._id, userA: { $in: adminIds } },
          ],
        })
          .sort({ updatedAt: -1 })
          .lean();

        let peerId;
        let peerName = "Brand";
        let connectionId;

        if (existing) {
          connectionId = existing.connectionId;
          const a = String(existing.userA);
          const b = String(existing.userB);
          peerId = a === viewerId ? b : a;
          const peerDoc = adminUsers.find((u) => String(u._id) === peerId);
          if (peerDoc?.name) peerName = peerDoc.name;
        } else {
          const peer = adminUsers[0];
          peerId = String(peer._id);
          peerName = peer.name || brand;
          const sortedIds = [viewerId, peerId].sort();
          connectionId = sortedIds.join("_");
          const userAId = sortedIds[0] === viewerId ? dbUser._id : peer._id;
          const userBId = sortedIds[0] === viewerId ? peer._id : dbUser._id;
          await Conversations.findOneAndUpdate(
            { connectionId },
            {
              $setOnInsert: {
                userA: userAId,
                userB: userBId,
                connectionId,
              },
            },
            { upsert: true, new: true }
          );
        }

        const sortedPair = [viewerId, peerId].sort();
        return NextResponse.json({
          userA: sortedPair[0],
          userB: sortedPair[1],
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
