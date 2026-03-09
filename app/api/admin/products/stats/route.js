import { connectDB } from "@/app/lib/db";
import Order from "@/app/models/Order";
import { NextResponse } from "next/server";

export async function GET(req) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const brand = searchParams.get("brand");

        if (!brand) {
            return NextResponse.json({ error: "Brand is required" }, { status: 400 });
        }

        const stats = await Order.aggregate([
            { $match: { brand, paymentStatus: "completed" } },
            {
                $group: {
                    _id: "$productId",
                    orders: { $sum: "$quantity" },
                    revenue: { $sum: "$totalAmount" },
                },
            },
        ]);

        const statsMap = {};
        for (const s of stats) {
            statsMap[s._id?.toString?.() || ""] = {
                orders: s.orders || 0,
                revenue: Math.round(s.revenue || 0),
            };
        }

        return NextResponse.json({ stats: statsMap }, { status: 200 });
    } catch (error) {
        console.error("Error fetching product stats:", error);
        return NextResponse.json(
            { error: "Failed to fetch product stats" },
            { status: 500 }
        );
    }
}
