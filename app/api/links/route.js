import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/db";
import LinkTree from "@/app/models/LinkTree";
import { refreshImageUrl } from "@/app/lib/gcs";

export async function GET(req) {
  try {
    const brand = req.nextUrl.searchParams.get("brand")?.trim();
    if (!brand) {
      return NextResponse.json({ error: "brand required" }, { status: 400 });
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
    return NextResponse.json({ linkTree: doc });
  } catch (e) {
    console.error("GET /api/links:", e);
    return NextResponse.json(
      { error: "Failed to fetch links" },
      { status: 500 }
    );
  }
}
