import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { connectDB } from "@/app/lib/db";
import BlogPost from "@/app/models/BlogPost";

export async function GET(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const brand = req.nextUrl.searchParams.get("brand")?.trim();
      if (!brand) {
        return NextResponse.json({ error: "brand required" }, { status: 400 });
      }
      const isAdmin = await isBrandAdmin(decodedToken.email, brand);
      if (!isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await connectDB();
      const posts = await BlogPost.find({ brand })
        .sort({ updatedAt: -1 })
        .lean();
      return NextResponse.json({ posts });
    },
  });
}

function slugify(text) {
  return (text || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "untitled";
}

export async function POST(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const body = await req.json().catch(() => ({}));
        const brand = (body.brand || "").toString().trim();
        const title = (body.title || "").toString().trim() || "Untitled Post";
        let slug = (body.slug || "").toString().trim() || slugify(title);
        const content = (body.content || "").toString();
        const excerpt = (body.excerpt || "").toString().trim();
        const featuredImage = (body.featuredImage || "").toString().trim();
        const status =
          body.status === "published" ? "published" : "draft";
        const metaTitle = (body.metaTitle || "").toString().trim();
        const metaDescription = (body.metaDescription || "").toString().trim();
        const author = (body.author || decodedToken?.email || "").toString().trim();

        if (!brand) {
          return NextResponse.json(
            { error: "brand is required" },
            { status: 400 }
          );
        }

        const isAdmin = await isBrandAdmin(decodedToken.email, brand);
        if (!isAdmin) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        slug = slugify(slug) || "untitled";

        await connectDB();

        let finalSlug = slug;
        let counter = 1;
        while (await BlogPost.findOne({ brand, slug: finalSlug }).lean()) {
          finalSlug = `${slug}-${counter}`;
          counter += 1;
        }

        const publishedAt =
          status === "published" ? new Date() : null;

        const post = await BlogPost.create({
          brand,
          title,
          slug: finalSlug,
          content,
          excerpt,
          featuredImage,
          status,
          publishedAt,
          author,
          metaTitle: metaTitle || title,
          metaDescription: metaDescription || excerpt,
        });

        const created = await BlogPost.findById(post._id).lean();
        return NextResponse.json({ post: created });
      } catch (e) {
        console.error("admin blogs POST:", e);
        return NextResponse.json(
          { error: e?.message || "Failed to create post" },
          { status: 500 }
        );
      }
    },
  });
}
