import { NextResponse } from "next/server";
import { client } from "@/app/lib/sanity";

function normalizeSubdomain(value) {
  if (!value || typeof value !== "string") return "";
  return value.trim().toLowerCase().replace(/\.kavisha\.ai$/i, "");
}

export async function GET(req) {
  try {
    const subdomain = new URL(req.url).searchParams.get("subdomain");
    const normalized = normalizeSubdomain(subdomain);

    if (!normalized) {
      return NextResponse.json(
        { available: false, error: "Subdomain is required" },
        { status: 400 }
      );
    }

    if (!client) {
      return NextResponse.json(
        { available: false, error: "Service unavailable" },
        { status: 503 }
      );
    }

    const existing = await client.fetch(
      `*[_type == "brand" && subdomain == $sub][0]{ _id }`,
      { sub: normalized }
    );

    return NextResponse.json({
      available: !existing,
      subdomain: normalized,
    });
  } catch (err) {
    console.error("check-subdomain:", err);
    return NextResponse.json(
      { available: false, error: "Failed to check subdomain" },
      { status: 500 }
    );
  }
}
