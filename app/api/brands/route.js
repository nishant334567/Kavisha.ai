import { NextResponse } from "next/server";
import { listPublicBrands } from "@/app/lib/brandRepository";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const featuredOnly = searchParams.get("featured") === "true";
    const brands = await listPublicBrands({ featuredOnly });
    return NextResponse.json({ brands }, { status: 200 });
  } catch (error) {
    console.error("Error fetching brands:", error);
    return NextResponse.json(
      { error: "Failed to fetch brands" },
      { status: 500 }
    );
  }
}
