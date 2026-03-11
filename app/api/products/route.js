import { connectDB } from "@/app/lib/db";
import Product from "@/app/models/Product";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const brand = searchParams.get("subdomain") || searchParams.get("brand");

    if (!brand) {
      return NextResponse.json({ error: "subdomain or brand is required" }, { status: 400 });
    }

    const products = await Product.find({ brand }).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
