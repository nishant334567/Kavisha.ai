import { connectDB } from "@/app/lib/db";
import Product from "@/app/models/Product";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const product = await Product.findById(id).lean();
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

export async function PATCH(req, { params }) {
  try {
    await connectDB();
    const { id } = await params;
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
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const update = {
      name,
      url: url ?? "",
      tagline: tagline ?? "",
      description: description ?? "",
      specifications: specifications ?? "",
      termsAndConditions: termsAndConditions ?? "",
    };
    if (Array.isArray(images)) update.images = images.filter(Boolean);
    if (price !== undefined) update.price = Number(price) || 0;
    if (discountPercentage !== undefined)
      update.discountPercentage = Math.min(100, Math.max(0, Number(discountPercentage) || 0));

    const product = await Product.findByIdAndUpdate(id, update, { new: true });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ product }, { status: 200 });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Product deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
