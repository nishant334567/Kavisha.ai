import { connectDB } from "@/app/lib/db";
import Product from "@/app/models/Product";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
    try {
        await connectDB();
        const { id } = await params;
        const { searchParams } = new URL(req.url);
        const brand = searchParams.get("subdomain") || searchParams.get("brand");

        if (!brand) {
            return NextResponse.json(
                { error: "subdomain or brand is required" },
                { status: 400 }
            );
        }

        const product = await Product.findOne({ _id: id, brand }).lean();
        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        return NextResponse.json({ product });
    } catch (error) {
        console.error("Error fetching product:", error);
        return NextResponse.json(
            { error: "Failed to fetch product" },
            { status: 500 }
        );
    }
}
