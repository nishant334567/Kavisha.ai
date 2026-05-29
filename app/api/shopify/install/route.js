import { NextResponse } from "next/server";

/** Legacy entry: forward to App Store–compliant OAuth entry. */
export async function GET(req) {
  const url = new URL(req.url);
  const target = new URL("/api/shopify/auth", url.origin);
  for (const key of ["shop", "brand"]) {
    const v = url.searchParams.get(key);
    if (v) target.searchParams.set(key, v);
  }
  return NextResponse.redirect(target, 307);
}
