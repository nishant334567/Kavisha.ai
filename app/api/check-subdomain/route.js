import { NextResponse } from "next/server";
import { subdomainExists } from "@/app/lib/brandRepository";

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

    const existing = await subdomainExists(normalized);

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
