import { NextResponse } from "next/server";
import { client } from "@/app/lib/sanity";
import { normalizeBrandHex } from "@/app/lib/brandTheme";

/**
 * Public read for embed widget + optional clients. No auth.
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const brand = (searchParams.get("brand") || searchParams.get("subdomain") || "")
    .trim()
    .toLowerCase();

  if (!brand || !/^[a-z0-9-]+$/.test(brand)) {
    return NextResponse.json({ error: "Invalid brand" }, { status: 400 });
  }

  if (!client) {
    return NextResponse.json({
      primaryBrandColor: null,
      secondaryBrandColor: null,
    });
  }

  try {
    const data = await client.fetch(
      `*[_type == "brand" && subdomain == $brand][0]{ primaryBrandColor, secondaryBrandColor }`,
      { brand }
    );

    return NextResponse.json(
      {
        primaryBrandColor: normalizeBrandHex(data?.primaryBrandColor),
        secondaryBrandColor: normalizeBrandHex(data?.secondaryBrandColor),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600",
        },
      }
    );
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to load brand theme" },
      { status: 500 }
    );
  }
}
