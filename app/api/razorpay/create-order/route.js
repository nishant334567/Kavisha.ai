import Razorpay from "razorpay";
import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";

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
                if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
                    return NextResponse.json(
                        { error: "Razorpay is not configured" },
                        { status: 500 }
                    );
                }
                const amount = 2000; // ₹20 in paise
                const currency = "INR";
                const receipt = `conn_${Date.now()}`.slice(0, 40); // Razorpay max 40 chars

                const razorpay = new Razorpay({
                    key_id: process.env.RAZORPAY_KEY_ID,
                    key_secret: process.env.RAZORPAY_KEY_SECRET,
                });

                const order = await razorpay.orders.create({
                    amount,
                    currency,
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