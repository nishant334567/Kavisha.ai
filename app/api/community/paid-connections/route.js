import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { createOrGetUser } from "@/app/lib/firebase/create-user";
import { connectDB } from "@/app/lib/db";
import Payment from "@/app/models/Payment";

/**
 * GET /api/community/paid-connections
 * Returns list of targetUserIds the current user has paid to connect with (community_connect).
 * Used to show "Message" and allow opening chat without paying again after page reload.
 */
export async function GET(request) {
    return withAuth(request, {
        onAuthenticated: async ({ decodedToken }) => {
            try {
                const dbUser = await createOrGetUser(decodedToken);
                await connectDB();
                const payments = await Payment.find({
                    type: "community_connect",
                    payerUserId: dbUser._id,
                })
                    .select("metadata")
                    .lean();
                const ids = [...new Set(
                    payments
                        .map((p) => p.metadata?.targetUserId)
                        .filter(Boolean)
                        .map((id) => String(id))
                )];
                return NextResponse.json({ paidTargetUserIds: ids });
            } catch (err) {
                console.error("paid-connections error:", err);
                return NextResponse.json(
                    { error: err?.message ?? "Failed to fetch" },
                    { status: 500 }
                );
            }
        },
        onUnauthenticated: async () =>
            NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    });
}
