import { client, urlFor } from "@/app/lib/sanity";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    if (!client) {
      return NextResponse.json(
        { error: "Sanity client not available" },
        { status: 500 }
      );
    }

    const brands = await client.fetch(
      `*[_type == "brand"] {
        _id,
        brandName,
        title,
        subtitle,
        subdomain,
        brandImage
      }`
    );

    // Transform brands with image URLs
    const transformedBrands = brands.map((brand) => ({
      id: brand._id,
      name: brand.brandName,
      title: brand.title || "",
      subtitle: brand.subtitle || "",
      subdomain: brand.subdomain,
      image: brand.brandImage?.asset?._ref
        ? urlFor(brand.brandImage).url()
        : null,
    }));

    return NextResponse.json({ brands: transformedBrands }, { status: 200 });
  } catch (error) {
    console.error("Error fetching brands:", error);
    return NextResponse.json(
      { error: "Failed to fetch brands" },
      { status: 500 }
    );
  }
}
