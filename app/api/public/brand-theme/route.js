import { NextResponse } from "next/server";
import { getPublicBrandTheme } from "@/app/lib/brandRepository";

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

  try {
    const theme = await getPublicBrandTheme(brand);
    return NextResponse.json(theme);
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to load brand theme" },
      { status: 500 }
    );
  }
}
