import { connectDB } from "@/app/lib/db";
import Product from "@/app/models/Product";
import { refreshImageUrls } from "@/app/lib/gcs";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const brand = searchParams.get("brand");

    if (!brand) {
      return NextResponse.json({ error: "Brand is required" }, { status: 400 });
    }

    const products = await Product.find({ brand }).sort({ createdAt: -1 }).lean();
    const productsWithFreshImages = await Promise.all(
      products.map(async (p) => {
        const images = Array.isArray(p.images) ? await refreshImageUrls(p.images) : [];
        return { ...p, images };
      })
    );

    return NextResponse.json({ products: productsWithFreshImages }, { status: 200 });
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
      type,
      digitalFiles,
    } = body;

    if (!name || !brand) {
      return NextResponse.json(
        { error: "Name and brand are required" },
        { status: 400 }
      );
    }

    const productType = type === "digital" ? "digital" : "physical";
    const files = Array.isArray(digitalFiles)
      ? digitalFiles.filter((f) => f && f.gcsPath && f.filename && f.mimeType)
      : [];

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
      type: productType,
      digitalFiles: productType === "digital" ? files : [],
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
