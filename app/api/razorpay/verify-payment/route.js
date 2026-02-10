import { NextResponse } from "next/server";
import crypto from "crypto";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { connectDB } from "@/app/lib/db";
import Payment from "@/app/models/Payment";

export async function POST(request) {
    return withAuth(request, {
        onAuthenticated: async () => {
            try {
                const body = await request.json();
                const {
                    razorpay_order_id,
                    razorpay_payment_id,
                    razorpay_signature,
                    userId: payerUserId,
                    type = "community_connect",
                    metadata = {},
                    amount,
                    currency = "INR",
                } = body ?? {};
                if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
                    return NextResponse.json(
                        { success: false, error: "Missing payment details" },
                        { status: 400 }
                    );
                }
                const secret = process.env.RAZORPAY_KEY_SECRET;
                if (!secret) {
                    return NextResponse.json(
                        { success: false, error: "Razorpay not configured" },
                        { status: 500 }
                    );
                }
                const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
                const expectedSignature = crypto
                    .createHmac("sha256", secret)
                    .update(payload)
                    .digest("hex");
                if (expectedSignature !== razorpay_signature) {
                    return NextResponse.json({ success: false });
                }

                await connectDB();
                const existing = await Payment.findOne({
                    razorpayPaymentId: razorpay_payment_id,
                }).lean();
                if (existing) {
                    return NextResponse.json({
                        success: false,
                        error: "Payment already used",
                    });
                }

                if (!payerUserId) {
                    return NextResponse.json(
                        { success: false, error: "userId required" },
                        { status: 400 }
                    );
                }

                await Payment.create({
                    razorpayOrderId: razorpay_order_id,
                    razorpayPaymentId: razorpay_payment_id,
                    payerUserId,
                    amount: amount != null ? amount : 2000,
                    currency,
                    type,
                    metadata,
                });
                return NextResponse.json({ success: true });
            } catch (err) {
                console.error("Razorpay verify-payment error:", err);
                return NextResponse.json(
                    { success: false, error: err?.message ?? "Verification failed" },
                    { status: 500 }
                );
            }
        },
        onUnauthenticated: async () =>
            NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 }),
    });
}
