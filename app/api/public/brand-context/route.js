import { NextResponse } from "next/server";
import {
  getBrandBySubdomain,
  mapBrandToClientContext,
} from "@/app/lib/brandRepository";

/**
 * Public brand context for subdomain sites (no auth required for base fields).
 * Pass ?email= for isBrandAdmin when the client knows the signed-in user.
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const subdomain = (searchParams.get("subdomain") || "").trim().toLowerCase();
  const userEmail = (searchParams.get("email") || "").trim();

  if (!subdomain || !/^[a-z0-9-]+$/.test(subdomain)) {
    return NextResponse.json({ error: "Invalid subdomain" }, { status: 400 });
  }

  try {
    const brand = await getBrandBySubdomain(subdomain);
    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }
    const context = await mapBrandToClientContext(brand, userEmail || undefined);
    return NextResponse.json(context);
  } catch (e) {
    console.error("[public/brand-context]", e);
    return NextResponse.json(
      { error: "Failed to load brand context" },
      { status: 500 }
    );
  }
}
