import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { createRazorpayOrder } from "@/app/lib/razorpay";

export async function POST(request) {
    return withAuth(request, {
        onAuthenticated: async () => {
            try {
                const body = await request.json();
                const { userId, targetUserId } = body ?? {};
                if (!userId || !targetUserId) {
                    return NextResponse.json(
                        { error: "userId and targetUserId are required" },
                        { status: 400 }
                    );
                }
                const amount = 2000; // ₹20 in paise
                const receipt = `conn_${Date.now()}`;

                const order = await createRazorpayOrder({
                    amount,
                    receipt,
                    notes: { userId, targetUserId },
                });

                return NextResponse.json({
                    orderId: order.id,
                    amount: order.amount,
                    currency: order.currency,
                });
            } catch (err) {
                console.error("Razorpay create-order error:", err);
                return NextResponse.json(
                    { error: err?.message ?? "Failed to create order" },
                    { status: 500 }
                );
            }
        },
        onUnauthenticated: async () =>
            NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
    });
}