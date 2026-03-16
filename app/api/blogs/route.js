import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import BlogPost from "@/app/models/BlogPost";

export async function GET(req) {
  try {
    const brand = req.nextUrl.searchParams.get("brand")?.trim();
    if (!brand) {
      return NextResponse.json({ error: "brand required" }, { status: 400 });
    }
    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "12", 10)));
    const skip = (page - 1) * limit;

    await connectDB();
    const now = new Date();
    const query = {
      brand,
      status: "published",
      $or: [{ publishedAt: { $lte: now } }, { publishedAt: null }],
    };

    const [posts, totalCount] = await Promise.all([
      BlogPost.find(query)
        .sort({ publishedAt: -1, updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("title slug excerpt featuredImage publishedAt author")
        .lean(),
      BlogPost.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      posts,
      currentPage: page,
      totalPages,
      totalCount,
    });
  } catch (e) {
    console.error("blogs GET:", e);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}
