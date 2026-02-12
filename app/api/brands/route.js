import { client, urlFor } from "@/app/lib/sanity";
import { NextResponse } from "next/server";

const ROOT_HOST = process.env.NODE_ENV === "staging" ? "staging.kavisha.ai" : "kavisha.ai";

export async function GET(req) {
  try {
    if (!client) {
      return NextResponse.json(
        { error: "Sanity client not available" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const featuredOnly = searchParams.get("featured") === "true";
    const baseFilter = '_type == "brand" && subdomain != "kavisha" && !(_id in path("drafts.**"))';
    const filter = featuredOnly
      ? `${baseFilter} && featuredAvatar == true`
      : baseFilter;

    const brands = await client.fetch(
      `*[${filter}] {
        _id,
        brandName,
        title,
        subtitle,
        subdomain,
        brandImage
      } | order(brandName asc)`
    );

    // Transform brands with image URLs and generate links
    const transformedBrands = brands.map((brand) => {
      const imageUrl = brand.brandImage?.asset?._ref
        ? urlFor(brand.brandImage).url()
        : null;

      // Generate link to avatar home page
      const link = `https://${brand.subdomain}.${ROOT_HOST}`;

      return {
        id: brand._id,
        name: brand.brandName,
        title: brand.title || "",
        subtitle: brand.subtitle || "",
        subdomain: brand.subdomain,
        image: imageUrl,
        link: link,
      };
    });

    return NextResponse.json({ brands: transformedBrands }, { status: 200 });
  } catch (error) {
    console.error("Error fetching brands:", error);
    return NextResponse.json(
      { error: "Failed to fetch brands" },
      { status: 500 }
    );
  }
}
