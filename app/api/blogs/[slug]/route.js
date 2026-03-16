import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import BlogPost from "@/app/models/BlogPost";

export async function GET(req, { params }) {
  try {
    const { slug } = await params;
    const brand = req.nextUrl.searchParams.get("brand")?.trim();
    if (!slug || !brand) {
      return NextResponse.json(
        { error: "slug and brand required" },
        { status: 400 }
      );
    }

    await connectDB();
    const now = new Date();
    const post = await BlogPost.findOne({
      brand,
      slug: String(slug).trim(),
      status: "published",
      $or: [{ publishedAt: { $lte: now } }, { publishedAt: null }],
    }).lean();

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (e) {
    console.error("blogs [slug] GET:", e);
    return NextResponse.json({ error: "Failed to fetch post" }, { status: 500 });
  }
}
