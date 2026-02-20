import { NextResponse } from "next/server";
import { verifyUnsubscribeToken } from "@/app/lib/unsubscribe-token";

export async function GET(req) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing link. Please use the link from your email." }, { status: 400 });
  }
  const data = verifyUnsubscribeToken(token);
  if (!data) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
  }
  const brandName = data.brand ? data.brand.charAt(0).toUpperCase() + data.brand.slice(1) : "this brand";
  return NextResponse.json({ brand: data.brand, brandName });
}
