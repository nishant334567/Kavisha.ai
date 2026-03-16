import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { connectDB } from "@/app/lib/db";
import BlogPost from "@/app/models/BlogPost";

export async function GET(req, { params }) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const { slug } = await params;
      const brand = req.nextUrl.searchParams.get("brand")?.trim();
      if (!slug || !brand) {
        return NextResponse.json(
          { error: "slug and brand required" },
          { status: 400 }
        );
      }
      const isAdmin = await isBrandAdmin(decodedToken.email, brand);
      if (!isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await connectDB();
      const post = await BlogPost.findOne({ brand, slug: String(slug).trim() }).lean();
      if (!post) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }
      return NextResponse.json({ post });
    },
  });
}

function slugifyStr(text) {
  return (text || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "untitled";
}

export async function PATCH(req, { params }) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const { slug } = await params;
        const brand = req.nextUrl.searchParams.get("brand")?.trim();
        if (!slug || !brand) {
          return NextResponse.json(
            { error: "slug and brand required" },
            { status: 400 }
          );
        }
        const isAdmin = await isBrandAdmin(decodedToken.email, brand);
        if (!isAdmin) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const body = await req.json().catch(() => ({}));
        await connectDB();
        const existing = await BlogPost.findOne({
          brand,
          slug: String(slug).trim(),
        }).lean();
        if (!existing) {
          return NextResponse.json({ error: "Post not found" }, { status: 404 });
        }
        const updates = {};
        if (body.title !== undefined) updates.title = String(body.title).trim();
        if (body.slug !== undefined)
          updates.slug = slugifyStr(body.slug) || existing.slug;
        if (body.content !== undefined) updates.content = String(body.content);
        if (body.excerpt !== undefined)
          updates.excerpt = String(body.excerpt).trim();
        if (body.featuredImage !== undefined)
          updates.featuredImage = String(body.featuredImage).trim();
        if (body.status !== undefined) {
          updates.status =
            body.status === "published"
              ? "published"
              : body.status === "archived"
                ? "archived"
                : "draft";
          if (updates.status === "published" && !existing.publishedAt) {
            updates.publishedAt = new Date();
          }
        }
        if (body.metaTitle !== undefined)
          updates.metaTitle = String(body.metaTitle).trim();
        if (body.metaDescription !== undefined)
          updates.metaDescription = String(body.metaDescription).trim();
        const updated = await BlogPost.findOneAndUpdate(
          { _id: existing._id },
          { $set: updates },
          { new: true, lean: true }
        );
        return NextResponse.json({ post: updated });
      } catch (e) {
        console.error("admin blogs PATCH:", e);
        return NextResponse.json(
          { error: e?.message || "Failed to update" },
          { status: 500 }
        );
      }
    },
  });
}

export async function DELETE(req, { params }) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      const { slug } = await params;
      const brand = req.nextUrl.searchParams.get("brand")?.trim();
      if (!slug || !brand) {
        return NextResponse.json(
          { error: "slug and brand required" },
          { status: 400 }
        );
      }
      const isAdmin = await isBrandAdmin(decodedToken.email, brand);
      if (!isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      await connectDB();
      const deleted = await BlogPost.findOneAndDelete({
        brand,
        slug: String(slug).trim(),
      });
      if (!deleted) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    },
  });
}
