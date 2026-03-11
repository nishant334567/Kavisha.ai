import { connectDB } from "@/app/lib/db";
import Product from "@/app/models/Product";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const brand = searchParams.get("brand");

    if (!brand) {
      return NextResponse.json({ error: "Brand is required" }, { status: 400 });
    }

    const products = await Product.find({ brand }).sort({ createdAt: -1 });

    return NextResponse.json({ products }, { status: 200 });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const body = await req.json();
    const {
      name,
      url,
      tagline,
      description,
      specifications,
      termsAndConditions,
      images,
      price,
      discountPercentage,
      brand,
    } = body;

    if (!name || !brand) {
      return NextResponse.json(
        { error: "Name and brand are required" },
        { status: 400 }
      );
    }

    const product = await Product.create({
      name,
      url: url || "",
      tagline: tagline || "",
      description: description || "",
      specifications: specifications || "",
      termsAndConditions: termsAndConditions || "",
      images: Array.isArray(images) ? images.filter(Boolean) : [],
      price: Number(price) || 0,
      discountPercentage: Math.min(100, Math.max(0, Number(discountPercentage) || 0)),
      brand,
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
