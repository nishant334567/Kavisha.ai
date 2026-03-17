import { connectDB } from "@/app/lib/db";
import Product from "@/app/models/Product";
import { refreshImageUrls } from "@/app/lib/gcs";
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

    const sanitized = await Promise.all(
      products.map(async (p) => {
        const { digitalFiles, ...rest } = p;
        const images = Array.isArray(p.images) ? await refreshImageUrls(p.images) : [];
        return {
          ...rest,
          images,
          type: p.type || "physical",
          digitalFiles: Array.isArray(digitalFiles)
            ? digitalFiles.map((f) => ({ filename: f.filename, mimeType: f.mimeType }))
            : [],
        };
      })
    );

    return NextResponse.json({ products: sanitized });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}
