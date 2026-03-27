import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import LinkTree from "@/app/models/LinkTree";
import { refreshImageUrl } from "@/app/lib/gcs";
import { client } from "@/app/lib/sanity";

export async function GET(req) {
  try {
    const brand = req.nextUrl.searchParams.get("brand")?.trim();
    if (!brand) {
      return NextResponse.json({ error: "brand required" }, { status: 400 });
    }

    if (client) {
      const brandDoc = await client.fetch(
        `*[_type == "brand" && subdomain == $sub][0]{ enableLinks }`,
        { sub: brand }
      );
      if (brandDoc?.enableLinks === false) {
        return NextResponse.json({
          linkTree: null,
          enableLinks: false,
        });
      }
    }

    await connectDB();
    const doc = await LinkTree.findOne({ brand })
      .select("brand brandName title links social")
      .lean();
    if (!doc) {
      return NextResponse.json({ linkTree: null });
    }
    if (Array.isArray(doc.links) && doc.links.length > 0) {
      doc.links = await Promise.all(
        doc.links.map(async (link) => {
          const image = link.image && link.image.trim()
            ? await refreshImageUrl(link.image)
            : "";
          return { ...link, image };
        })
      );
    }
    return NextResponse.json({ linkTree: doc, enableLinks: true });
  } catch (e) {
    console.error("GET /api/links:", e);
    return NextResponse.json(
      { error: "Failed to fetch links" },
      { status: 500 }
    );
  }
}
