import { connectDB } from "@/app/lib/db";
import { getUserFromDB } from "@/app/lib/firebase/get-user";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import Order from "@/app/models/Order";
import { NextResponse } from "next/server";

export async function GET(req) {
    return withAuth(req, {
        onAuthenticated: async ({ decodedToken }) => {
            try {
                const user = await getUserFromDB(decodedToken.email);
                if (!user) {
                    return NextResponse.json({ error: "User not found" }, { status: 404 });
                }

                await connectDB();
                const orders = await Order.find({ customerId: user.id })
                    .sort({ createdAt: -1 })
                    .lean();

                return NextResponse.json({ orders });
            } catch (err) {
                console.error("Orders GET error:", err);
                return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
            }
        },
        onUnauthenticated: async () =>
            NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    });
}
