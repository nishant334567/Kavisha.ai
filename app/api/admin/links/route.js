import { NextResponse } from "next/server";
import { withAuth } from "@/app/lib/firebase/auth-middleware";
import { isBrandAdmin } from "@/app/lib/firebase/check-admin";
import { connectDB } from "@/app/lib/db";
import LinkTree from "@/app/models/LinkTree";
import { refreshImageUrl } from "@/app/lib/gcs";

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
      const doc = await LinkTree.findOne({ brand }).lean();
      if (doc && Array.isArray(doc.links) && doc.links.length > 0) {
        doc.links = await Promise.all(
          doc.links.map(async (link) => {
            const image = link.image && link.image.trim()
              ? await refreshImageUrl(link.image)
              : "";
            return { ...link, image };
          })
        );
      }
      return NextResponse.json({ linkTree: doc || null });
    },
    onUnauthenticated: async () =>
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  });
}

export async function PUT(req) {
  return withAuth(req, {
    onAuthenticated: async ({ decodedToken }) => {
      try {
        const body = await req.json().catch(() => ({}));
        const brand = (body.brand || "").toString().trim();
        const brandName = (body.brandName || "").toString().trim();
        const title = (body.title || "").toString().trim() || "My links";
        const links = Array.isArray(body.links)
          ? body.links
            .filter((l) => l && (l.label || "").toString().trim() && (l.url || "").toString().trim())
            .map((l) => ({
              label: (l.label || "").toString().trim(),
              url: (l.url || "").toString().trim(),
              image: (l.image || "").toString().trim(),
            }))
          : [];

        if (!brand) {
          return NextResponse.json({ error: "brand required" }, { status: 400 });
        }
        const isAdmin = await isBrandAdmin(decodedToken.email, brand);
        if (!isAdmin) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await connectDB();
        const doc = await LinkTree.findOneAndUpdate(
          { brand },
          { brand, brandName, title, links },
          { new: true, upsert: true }
        ).lean();

        return NextResponse.json({ linkTree: doc });
      } catch (e) {
        console.error("admin links PUT:", e);
        return NextResponse.json(
          { error: e?.message || "Failed to save" },
          { status: 500 }
        );
      }
    },
    onUnauthenticated: async () =>
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
  });
}
