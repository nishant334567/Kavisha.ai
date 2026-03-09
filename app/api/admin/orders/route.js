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

        const orders = await Order.find({ brand })
            .populate("customerId", "name email image")
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({ orders }, { status: 200 });
    } catch (error) {
        console.error("Error fetching admin orders:", error);
        return NextResponse.json(
            { error: "Failed to fetch orders" },
            { status: 500 }
        );
    }
}
