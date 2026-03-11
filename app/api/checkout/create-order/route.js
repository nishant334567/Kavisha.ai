import { connectDB } from "@/app/lib/db";
import { getUserFromDB } from "@/app/lib/firebase/get-user";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { createRazorpayOrder } from "@/app/lib/razorpay";
import Cart from "@/app/models/Cart";
import { NextResponse } from "next/server";

function rupeesToPaise(rupees) {
    return Math.round(Number(rupees) * 100);
}

export async function POST(req) {
    return withAuth(req, {
        onAuthenticated: async ({ decodedToken }) => {
            try {
                const user = await getUserFromDB(decodedToken.email);
                if (!user) {
                    return NextResponse.json({ error: "User not found" }, { status: 404 });
                }

                const body = await req.json().catch(() => ({}));
                const brand = body?.brand;
                if (!brand) {
                    return NextResponse.json(
                        { error: "brand is required" },
                        { status: 400 }
                    );
                }

                await connectDB();
                const cart = await Cart.findOne({ userId: user.id, brand });
                const items = cart?.items || [];

                if (items.length === 0) {
                    return NextResponse.json(
                        { error: "Cart is empty" },
                        { status: 400 }
                    );
                }

                const totalRupees = items.reduce(
                    (sum, i) => sum + (i.priceSnapshot || 0) * (i.quantity || 0),
                    0
                );
                const amountPaise = rupeesToPaise(totalRupees);

                if (amountPaise < 100) {
                    return NextResponse.json(
                        { error: "Minimum order amount is ₹1" },
                        { status: 400 }
                    );
                }

                const receipt = `checkout_${Date.now()}`;
                const order = await createRazorpayOrder({
                    amount: amountPaise,
                    receipt,
                    notes: {
                        userId: user.id,
                        brand,
                        type: "product_order",
                    },
                });

                return NextResponse.json({
                    orderId: order.id,
                    amount: order.amount,
                    currency: order.currency,
                });
            } catch (err) {
                console.error("Checkout create-order error:", err);
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