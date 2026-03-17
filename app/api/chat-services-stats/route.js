import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { connectDB } from "@/app/lib/db";
import Session from "@/app/models/ChatSessions";
import Logs from "@/app/models/ChatLogs";
import { client } from "@/app/lib/sanity";

export async function GET(request) {
  return withAuth(request, {
    onAuthenticated: async () => {
      try {
        const { searchParams } = new URL(request.url);
        const brand = searchParams.get("brand")?.trim();
        if (!brand) {
          return NextResponse.json(
            { error: "brand query required" },
            { status: 400 }
          );
        }

        if (!client) {
          return NextResponse.json(
            { error: "Sanity not configured" },
            { status: 500 }
          );
        }

        const brandDoc = await client.fetch(
          `*[_type == "brand" && subdomain == $brand][0]{ services }`,
          { brand }
        );
        const rawServices = brandDoc?.services || [];
        if (!Array.isArray(rawServices) || rawServices.length === 0) {
          return NextResponse.json({ services: [] });
        }

        await connectDB();

        const sessionStats = await Session.aggregate([
          {
            $match: {
              brand,
              $or: [
                { isCommunityChat: { $ne: true } },
                { isCommunityChat: { $exists: false } },
              ],
            },
          },
          {
            $group: {
              _id: "$serviceKey",
              chatCount: { $sum: 1 },
              userIds: { $addToSet: "$userId" },
            },
          },
          {
            $project: {
              chatCount: 1,
              userCount: { $size: "$userIds" },
            },
          },
        ]);

        const statsByKey = {};
        sessionStats.forEach((s) => {
          const key = s._id ?? "";
          statsByKey[key] = {
            chatCount: s.chatCount || 0,
            userCount: s.userCount || 0,
          };
        });

        const sessionIdsByServiceKey = await Session.aggregate([
          {
            $match: {
              brand,
              serviceKey: { $exists: true, $ne: null, $ne: "" },
              $or: [
                { isCommunityChat: { $ne: true } },
                { isCommunityChat: { $exists: false } },
              ],
            },
          },
          { $group: { _id: "$serviceKey", sessionIds: { $push: "$_id" } } },
        ]);

        const messageCountByKey = {};
        for (const row of sessionIdsByServiceKey) {
          const key = row._id ?? "";
          const count = await Logs.countDocuments({
            sessionId: { $in: row.sessionIds },
          });
          messageCountByKey[key] = count;
        }

        const services = rawServices.map((s) => {
          const key = s._key ?? s.name ?? "";
          const stats = statsByKey[key] || { chatCount: 0, userCount: 0 };
          const messageCount = messageCountByKey[key] ?? 0;
          return {
            _key: key,
            name: s.name,
            title: s.title,
            initialMessage: s.initialMessage,
            chatCount: stats.chatCount,
            userCount: stats.userCount,
            messageCount,
          };
        });

        return NextResponse.json({ services });
      } catch (err) {
        console.error("chat-services-stats GET:", err);
        return NextResponse.json(
          { error: err?.message || "Failed to fetch stats" },
          { status: 500 }
        );
      }
    },
  });
}
