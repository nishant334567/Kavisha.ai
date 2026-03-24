import { connectDB } from "@/app/lib/db";
import Payment from "@/app/models/Payment";
import { NextResponse } from "next/server";

function normalizePayment(payment) {
    if (!payment) return payment;
    return {
        ...payment,
        type: payment.type || payment.metadata?.type || "",
        brand: payment.brand || payment.metadata?.brand || "",
    };
}

export async function GET(req) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const razorpayOrderId = searchParams.get("razorpayOrderId");
        const brand = searchParams.get("brand");

        if (razorpayOrderId) {
            const payment = await Payment.findOne({ razorpayOrderId }).lean();
            if (!payment) {
                return NextResponse.json({ error: "Payment not found" }, { status: 404 });
            }
            return NextResponse.json({ payment: normalizePayment(payment) }, { status: 200 });
        }

        if (brand) {
            const payments = await Payment.find({
                type: "product_order",
                $or: [{ brand }, { "metadata.brand": brand }],
            })
                .sort({ createdAt: -1 })
                .lean();
            return NextResponse.json(
                { payments: payments.map(normalizePayment) },
                { status: 200 }
            );
        }

        return NextResponse.json({ error: "razorpayOrderId or brand required" }, { status: 400 });
    } catch (error) {
        console.error("Error fetching payments:", error);
        return NextResponse.json(
            { error: "Failed to fetch payments" },
            { status: 500 }
        );
    }
}
